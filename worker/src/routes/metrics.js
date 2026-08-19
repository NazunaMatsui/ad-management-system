import { Hono } from 'hono';
import { authMiddleware } from '../lib/auth.js';
import { getSupabase } from '../lib/supabase.js';

const router = new Hono();
router.use('*', authMiddleware());

// 集計ヘルパー
function aggregateMetrics(rows) {
  const totalSpend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const totalImpressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const totalClicks = rows.reduce((s, r) => s + Number(r.clicks || 0), 0);
  const totalConversionsMeta = rows.reduce((s, r) => s + Number(r.conversions_meta || 0), 0);
  const totalConversionsBooking = rows.reduce((s, r) => s + Number(r.conversions_booking || 0), 0);
  return {
    total_spend: totalSpend,
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    total_conversions_meta: totalConversionsMeta,
    total_conversions_booking: totalConversionsBooking,
    avg_cpa: totalConversionsBooking > 0 ? totalSpend / totalConversionsBooking : 0,
    avg_cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0,
    avg_cvr: totalClicks > 0 ? ((totalConversionsMeta + totalConversionsBooking) / totalClicks * 100) : 0,
  };
}

// 日次指標取得
router.get('/', async (c) => {
  const { start_date, end_date, campaign_id, campaign_ids } = c.req.query();
  const sb = getSupabase(c.env);
  try {
    let query = sb.from('daily_metrics').select('*, campaigns(campaign_name)');
    if (start_date) query = query.gte('date', start_date);
    if (end_date) query = query.lte('date', end_date);
    if (campaign_ids) {
      const ids = campaign_ids.split(',').map(Number).filter(Boolean);
      if (ids.length) query = query.in('campaign_id', ids);
    } else if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }
    query = query.order('date', { ascending: false }).order('campaign_id', { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    // フラットに変換（campaign_nameを直接プロパティに）
    const rows = (data || []).map(r => ({ ...r, campaign_name: r.campaigns?.campaign_name }));
    return c.json(rows);
  } catch (e) {
    console.error('指標取得エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// 集計データ取得
router.get('/summary', async (c) => {
  const { start_date, end_date, campaign_id, campaign_ids } = c.req.query();
  const sb = getSupabase(c.env);
  try {
    let query = sb.from('daily_metrics').select('*, campaigns(campaign_id, campaign_name)');
    if (start_date) query = query.gte('date', start_date);
    if (end_date) query = query.lte('date', end_date);
    if (campaign_ids) {
      const ids = campaign_ids.split(',').map(Number).filter(Boolean);
      if (ids.length) query = query.in('campaign_id', ids);
    } else if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }
    const { data, error } = await query;
    if (error) throw error;

    // キャンペーンIDごとにグループ化して集計
    const grouped = {};
    for (const row of data || []) {
      const cid = row.campaign_id;
      if (!grouped[cid]) grouped[cid] = { campaign_id: cid, campaign_name: row.campaigns?.campaign_name, rows: [] };
      grouped[cid].rows.push(row);
    }
    const result = Object.values(grouped).map(g => ({
      campaign_id: g.campaign_id,
      campaign_name: g.campaign_name,
      ...aggregateMetrics(g.rows),
    })).sort((a, b) => a.campaign_id - b.campaign_id);
    return c.json(result);
  } catch (e) {
    console.error('集計データ取得エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// 期間比較データ取得
router.get('/compare', async (c) => {
  const { start_date_a, end_date_a, start_date_b, end_date_b, campaign_id } = c.req.query();
  if (!start_date_a || !end_date_a || !start_date_b || !end_date_b) {
    return c.json({ error: '比較期間を指定してください' }, 400);
  }
  const sb = getSupabase(c.env);
  try {
    const fetchPeriod = async (start, end) => {
      let q = sb.from('daily_metrics').select('*').gte('date', start).lte('date', end);
      if (campaign_id) q = q.eq('campaign_id', campaign_id);
      const { data } = await q;
      return aggregateMetrics(data || []);
    };
    const [periodA, periodB] = await Promise.all([
      fetchPeriod(start_date_a, end_date_a),
      fetchPeriod(start_date_b, end_date_b),
    ]);
    const diff = (b, a) => b - a;
    const diffPct = (b, a) => a > 0 ? ((b - a) / a * 100) : 0;
    return c.json({
      period_a: periodA,
      period_b: periodB,
      differences: {
        spend_diff: diff(periodB.total_spend, periodA.total_spend),
        spend_diff_percent: diffPct(periodB.total_spend, periodA.total_spend),
        impressions_diff: diff(periodB.total_impressions, periodA.total_impressions),
        impressions_diff_percent: diffPct(periodB.total_impressions, periodA.total_impressions),
        clicks_diff: diff(periodB.total_clicks, periodA.total_clicks),
        clicks_diff_percent: diffPct(periodB.total_clicks, periodA.total_clicks),
        conversions_meta_diff: diff(periodB.total_conversions_meta, periodA.total_conversions_meta),
        conversions_meta_diff_percent: diffPct(periodB.total_conversions_meta, periodA.total_conversions_meta),
        conversions_booking_diff: diff(periodB.total_conversions_booking, periodA.total_conversions_booking),
        conversions_booking_diff_percent: diffPct(periodB.total_conversions_booking, periodA.total_conversions_booking),
        cpa_diff: diff(periodB.avg_cpa, periodA.avg_cpa),
        cpa_diff_percent: diffPct(periodB.avg_cpa, periodA.avg_cpa),
        cpc_diff: diff(periodB.avg_cpc, periodA.avg_cpc),
        cpc_diff_percent: diffPct(periodB.avg_cpc, periodA.avg_cpc),
        ctr_diff: diff(periodB.avg_ctr, periodA.avg_ctr),
        cvr_diff: diff(periodB.avg_cvr, periodA.avg_cvr),
      },
    });
  } catch (e) {
    console.error('期間比較エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// 日次指標登録・更新（upsert）
router.post('/', async (c) => {
  const { campaign_id, date, spend, impressions, clicks, conversions_meta, conversions_booking, data_source } = await c.req.json();
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('daily_metrics').upsert(
      { campaign_id, date, spend, impressions, clicks, conversions_meta, conversions_booking, data_source: data_source || 'manual', updated_at: new Date().toISOString() },
      { onConflict: 'campaign_id,date' }
    ).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (e) {
    console.error('指標登録エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// 日次指標削除
router.delete('/:id', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('daily_metrics').delete().eq('id', c.req.param('id')).select().single();
    if (error || !data) return c.json({ error: '指標が見つかりません' }, 404);
    return c.json({ message: '指標を削除しました' });
  } catch (e) {
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

export default router;
