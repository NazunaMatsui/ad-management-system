import { Hono } from 'hono';
import { authMiddleware } from '../lib/auth.js';
import { getSupabase } from '../lib/supabase.js';

const router = new Hono();
router.use('*', authMiddleware());

// メモ一覧取得
router.get('/', async (c) => {
  const { start_date, end_date, campaign_id } = c.req.query();
  const sb = getSupabase(c.env);
  try {
    let query = sb.from('operation_memos').select('*, campaigns(campaign_name), users!created_by(username)');
    if (start_date) query = query.gte('date', start_date);
    if (end_date) query = query.lte('date', end_date);
    if (campaign_id) query = query.eq('campaign_id', campaign_id);
    query = query.order('date', { ascending: false }).order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []).map(r => ({
      ...r,
      campaign_name: r.campaigns?.campaign_name,
      created_by_name: r.users?.username,
    }));
    return c.json(rows);
  } catch (e) {
    console.error('メモ取得エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// メモ詳細取得
router.get('/:id', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('operation_memos')
      .select('*, campaigns(campaign_name), users!created_by(username)')
      .eq('id', c.req.param('id')).single();
    if (error || !data) return c.json({ error: 'メモが見つかりません' }, 404);
    return c.json({ ...data, campaign_name: data.campaigns?.campaign_name, created_by_name: data.users?.username });
  } catch (e) {
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// メモ作成
router.post('/', async (c) => {
  const { campaign_id, date, memo_content } = await c.req.json();
  if (!campaign_id || !date || !memo_content) return c.json({ error: '必須項目を入力してください' }, 400);
  const sb = getSupabase(c.env);
  const user = c.get('user');
  try {
    const { data, error } = await sb.from('operation_memos')
      .insert({ campaign_id, date, memo_content, created_by: user.userId })
      .select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (e) {
    console.error('メモ作成エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// メモ更新
router.put('/:id', async (c) => {
  const { campaign_id, date, memo_content } = await c.req.json();
  const sb = getSupabase(c.env);
  const user = c.get('user');
  try {
    const { data: old } = await sb.from('operation_memos').select('*').eq('id', c.req.param('id')).single();
    if (old) {
      await sb.from('memo_history').insert({
        memo_id: old.id, campaign_id: old.campaign_id, date: old.date,
        memo_content: old.memo_content, changed_by: user.userId,
      });
    }
    const { data, error } = await sb.from('operation_memos')
      .update({ campaign_id, date, memo_content, updated_at: new Date().toISOString() })
      .eq('id', c.req.param('id')).select().single();
    if (error || !data) return c.json({ error: 'メモが見つかりません' }, 404);
    return c.json(data);
  } catch (e) {
    console.error('メモ更新エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// メモ削除
router.delete('/:id', async (c) => {
  const sb = getSupabase(c.env);
  const user = c.get('user');
  try {
    const { data: old } = await sb.from('operation_memos').select('*').eq('id', c.req.param('id')).single();
    if (!old) return c.json({ error: 'メモが見つかりません' }, 404);
    await sb.from('memo_history').insert({
      memo_id: old.id, campaign_id: old.campaign_id, date: old.date,
      memo_content: `[削除] ${old.memo_content}`, changed_by: user.userId,
    });
    await sb.from('operation_memos').delete().eq('id', c.req.param('id'));
    return c.json({ message: 'メモを削除しました' });
  } catch (e) {
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// メモ履歴取得
router.get('/:id/history', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('memo_history')
      .select('*, users!changed_by(username)')
      .eq('memo_id', c.req.param('id'))
      .order('changed_at', { ascending: false });
    if (error) throw error;
    const rows = (data || []).map(r => ({ ...r, changed_by_name: r.users?.username }));
    return c.json(rows);
  } catch (e) {
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

export default router;
