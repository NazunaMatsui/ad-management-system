const cron = require('node-cron');
const axios = require('axios');
const pool = require('../config/database');

// optimization_goal + custom_event_type → action_type マッピング
// Ads Manager の「結果」列と一致させる
const PIXEL_EVENT_ACTION_MAP = {
  LEAD:                  'offsite_conversion.fb_pixel_lead',
  PURCHASE:              'offsite_conversion.fb_pixel_purchase',
  COMPLETE_REGISTRATION: 'offsite_conversion.fb_pixel_complete_registration',
  ADD_TO_CART:           'offsite_conversion.fb_pixel_add_to_cart',
  INITIATE_CHECKOUT:     'offsite_conversion.fb_pixel_initiate_checkout',
  // カスタムイベント（SCHEDULE, CONTACTなど）は fb_pixel_custom
};

// optimization_goal のうち「リードフォーム」系
const LEAD_FORM_GOALS = new Set(['LEAD_GENERATION', 'QUALITY_LEAD']);

function extractResultConversions(objective, actions, optimizationInfo) {
  // ad set の最適化情報がある場合はそちらを優先
  if (optimizationInfo) {
    const { optimization_goal, promoted_object } = optimizationInfo;

    // Metaリードフォーム最適化
    if (LEAD_FORM_GOALS.has(optimization_goal)) {
      return actions
        .filter(a => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
        .reduce((sum, a) => sum + parseInt(a.value || 0), 0);
    }

    // ピクセルコンバージョン最適化
    if (optimization_goal === 'OFFSITE_CONVERSIONS' && promoted_object) {
      const customEventType = promoted_object.custom_event_type;
      const mappedActionType = PIXEL_EVENT_ACTION_MAP[customEventType];
      if (mappedActionType) {
        // 既知のピクセルイベント (LEAD, PURCHASEなど)
        return actions
          .filter(a => a.action_type === mappedActionType)
          .reduce((sum, a) => sum + parseInt(a.value || 0), 0);
      } else {
        // SCHEDULE, CONTACTなどカスタムイベント → fb_pixel_custom
        return actions
          .filter(a => a.action_type === 'offsite_conversion.fb_pixel_custom')
          .reduce((sum, a) => sum + parseInt(a.value || 0), 0);
      }
    }

    // メッセージ最適化
    if (optimization_goal === 'CONVERSATIONS') {
      return actions
        .filter(a => ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.messaging_first_reply'].includes(a.action_type))
        .reduce((sum, a) => sum + parseInt(a.value || 0), 0);
    }
  }

  // フォールバック: キャンペーン objective ベース
  const OBJECTIVE_FALLBACK = {
    OUTCOME_LEADS:      ['lead', 'onsite_conversion.lead_grouped'],
    OUTCOME_SALES:      ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'],
    OUTCOME_ENGAGEMENT: ['post_engagement'],
    OUTCOME_TRAFFIC:    ['link_click'],
    OUTCOME_AWARENESS:  ['reach'],
    MESSAGES:           ['onsite_conversion.messaging_conversation_started_7d'],
    CONVERSIONS:        ['offsite_conversion.fb_pixel_purchase', 'purchase'],
    LEAD_GENERATION:    ['lead', 'onsite_conversion.lead_grouped'],
  };
  const targetTypes = OBJECTIVE_FALLBACK[objective] || [];
  return actions
    .filter(a => targetTypes.includes(a.action_type))
    .reduce((sum, a) => sum + parseInt(a.value || 0), 0);
}

// Meta の effective_status → システムの status 文字列
function toSystemStatus(effectiveStatus) {
  switch (effectiveStatus) {
    case 'ACTIVE':    return 'active';
    case 'PAUSED':    return 'paused';
    case 'ARCHIVED':  return 'ended';
    case 'DELETED':   return 'ended';
    default:          return 'paused';
  }
}

// 指定期間の Meta インサイトを取得して DB に保存する共通関数
async function syncMetaData(startDate, endDate) {
  const token = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !adAccountId) {
    throw new Error('Meta APIの認証情報が設定されていません');
  }

  const META_API_VERSION = 'v19.0';
  const BASE = `https://graph.facebook.com/${META_API_VERSION}`;

  // ① キャンペーン一覧からステータスを取得（全件）
  const campaignsRes = await axios.get(`${BASE}/${adAccountId}/campaigns`, {
    params: {
      access_token: token,
      fields: 'id,name,effective_status',
      limit: 500,
    },
  });
  const campaignStatusMap = {};
  for (const c of campaignsRes.data.data || []) {
    console.log(`[Meta Campaign] id=${c.id} name=${c.name} effective_status=${c.effective_status}`);
    campaignStatusMap[c.id] = toSystemStatus(c.effective_status);
  }

  // ① ad set の optimization_goal + promoted_object を取得してキャンペーンIDでマッピング
  const adsetsRes = await axios.get(`${BASE}/${adAccountId}/adsets`, {
    params: {
      access_token: token,
      fields: 'campaign_id,optimization_goal,promoted_object',
      limit: 500,
    },
  });
  const campaignOptimizationMap = {};
  for (const adset of adsetsRes.data.data || []) {
    if (!campaignOptimizationMap[adset.campaign_id]) {
      campaignOptimizationMap[adset.campaign_id] = {
        optimization_goal: adset.optimization_goal,
        promoted_object: adset.promoted_object,
      };
    }
  }

  // ② インサイト（消化データ）取得
  const insightsRes = await axios.get(`${BASE}/${adAccountId}/insights`, {
    params: {
      access_token: token,
      level: 'campaign',
      time_increment: 1,
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      fields: 'campaign_id,campaign_name,objective,spend,impressions,clicks,actions,date_start',
      action_attribution_windows: ['7d_click', '1d_view'],
      limit: 500,
    },
  });

  const insights = insightsRes.data.data || [];
  let savedCount = 0;

  for (const row of insights) {
    const metaCampaignId = row.campaign_id;
    const campaignName = row.campaign_name;
    const date = row.date_start;
    const spend = parseFloat(row.spend || 0);
    const impressions = parseInt(row.impressions || 0);
    const actions = row.actions || [];
    const linkClickAction = actions.find(a => a.action_type === 'link_click');
    const clicks = linkClickAction ? parseInt(linkClickAction.value || 0) : 0;
    const optimizationInfo = campaignOptimizationMap[metaCampaignId] || null;
    const conversions = extractResultConversions(row.objective, actions, optimizationInfo);
    const status = campaignStatusMap[metaCampaignId] || 'paused';

    const campaignRes = await pool.query(
      `INSERT INTO campaigns (campaign_name, meta_campaign_id, status, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (meta_campaign_id) DO UPDATE SET
         campaign_name = EXCLUDED.campaign_name,
         status        = EXCLUDED.status,
         updated_at    = CURRENT_TIMESTAMP
       RETURNING campaign_id`,
      [campaignName, metaCampaignId, status]
    );
    const internalCampaignId = campaignRes.rows[0].campaign_id;

    await pool.query(
      `INSERT INTO daily_metrics (campaign_id, date, spend, impressions, clicks, conversions_meta, data_source)
       VALUES ($1, $2, $3, $4, $5, $6, 'meta_api')
       ON CONFLICT (campaign_id, date) DO UPDATE SET
         spend             = EXCLUDED.spend,
         impressions       = EXCLUDED.impressions,
         clicks            = EXCLUDED.clicks,
         conversions_meta  = EXCLUDED.conversions_meta,
         data_source       = 'meta_api',
         updated_at        = CURRENT_TIMESTAMP`,
      [internalCampaignId, date, spend, impressions, clicks, conversions]
    );

    savedCount++;
  }

  // ③ インサイトに出てこなかったキャンペーンのステータスも更新
  for (const [metaId, status] of Object.entries(campaignStatusMap)) {
    await pool.query(
      `UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE meta_campaign_id = $2`,
      [status, metaId]
    );
  }

  return savedCount;
}

// 前日分の日付文字列を返す（YYYY-MM-DD）
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// 今日の日付文字列
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// N日前の日付文字列を返す（YYYY-MM-DD）
function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// 毎朝9時に過去7日間〜当日分を同期（Metaのアトリビューション再計算に対応）
function startScheduler() {
  if (process.env.AUTO_FETCH_ENABLED !== 'true') {
    console.log('自動同期は無効です（AUTO_FETCH_ENABLED=false）');
    return;
  }

  // 毎日 09:00 JST（UTC+9 なので UTC 00:00）
  cron.schedule('0 0 * * *', async () => {
    const since = daysAgoStr(7);
    const today = todayStr();
    console.log(`[自動同期] 開始: ${since} 〜 ${today}（過去7日間、アトリビューション再計算対応）`);
    try {
      const count = await syncMetaData(since, today);
      console.log(`[自動同期] 完了: ${count}件`);
    } catch (err) {
      console.error('[自動同期] エラー:', err.message);
    }
  }, {
    timezone: 'Asia/Tokyo',
  });

  console.log('自動同期スケジューラー起動済み（毎日 09:00 JST、過去7日間）');
}

module.exports = { syncMetaData, startScheduler };
