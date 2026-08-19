import { getSupabase } from '../lib/supabase.js';

const PIXEL_EVENT_ACTION_MAP = {
  LEAD:                  'offsite_conversion.fb_pixel_lead',
  PURCHASE:              'offsite_conversion.fb_pixel_purchase',
  COMPLETE_REGISTRATION: 'offsite_conversion.fb_pixel_complete_registration',
  ADD_TO_CART:           'offsite_conversion.fb_pixel_add_to_cart',
  INITIATE_CHECKOUT:     'offsite_conversion.fb_pixel_initiate_checkout',
};

const LEAD_FORM_GOALS = new Set(['LEAD_GENERATION', 'QUALITY_LEAD']);

function extractResultConversions(objective, actions, optimizationInfo) {
  if (optimizationInfo) {
    const { optimization_goal, promoted_object } = optimizationInfo;
    if (LEAD_FORM_GOALS.has(optimization_goal)) {
      return actions.filter(a => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
        .reduce((sum, a) => sum + parseInt(a.value || 0), 0);
    }
    if (optimization_goal === 'OFFSITE_CONVERSIONS' && promoted_object) {
      const customEventType = promoted_object.custom_event_type;
      const mappedActionType = PIXEL_EVENT_ACTION_MAP[customEventType];
      if (mappedActionType) {
        return actions.filter(a => a.action_type === mappedActionType).reduce((sum, a) => sum + parseInt(a.value || 0), 0);
      } else {
        return actions.filter(a => a.action_type === 'offsite_conversion.fb_pixel_custom').reduce((sum, a) => sum + parseInt(a.value || 0), 0);
      }
    }
    if (optimization_goal === 'CONVERSATIONS') {
      return actions.filter(a => ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.messaging_first_reply'].includes(a.action_type))
        .reduce((sum, a) => sum + parseInt(a.value || 0), 0);
    }
  }
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
  return actions.filter(a => targetTypes.includes(a.action_type)).reduce((sum, a) => sum + parseInt(a.value || 0), 0);
}

function toSystemStatus(effectiveStatus) {
  switch (effectiveStatus) {
    case 'ACTIVE':   return 'active';
    case 'PAUSED':   return 'paused';
    case 'ARCHIVED': return 'ended';
    case 'DELETED':  return 'ended';
    default:         return 'paused';
  }
}

export async function syncMetaData(startDate, endDate, env) {
  const token = env.META_ACCESS_TOKEN;
  const adAccountId = env.META_AD_ACCOUNT_ID;
  if (!token || !adAccountId) throw new Error('Meta APIの認証情報が設定されていません');

  const BASE = `https://graph.facebook.com/v19.0`;
  const sb = getSupabase(env);

  // ① キャンペーン一覧
  const campaignsRes = await fetch(`${BASE}/${adAccountId}/campaigns?access_token=${token}&fields=id,name,effective_status&limit=500`);
  const campaignsData = await campaignsRes.json();
  const campaignStatusMap = {};
  for (const c of campaignsData.data || []) {
    console.log(`[Meta Campaign] id=${c.id} name=${c.name} effective_status=${c.effective_status}`);
    campaignStatusMap[c.id] = toSystemStatus(c.effective_status);
  }

  // ② Ad Sets
  const adsetsRes = await fetch(`${BASE}/${adAccountId}/adsets?access_token=${token}&fields=campaign_id,optimization_goal,promoted_object&limit=500`);
  const adsetsData = await adsetsRes.json();
  const campaignOptimizationMap = {};
  for (const adset of adsetsData.data || []) {
    if (!campaignOptimizationMap[adset.campaign_id]) {
      campaignOptimizationMap[adset.campaign_id] = { optimization_goal: adset.optimization_goal, promoted_object: adset.promoted_object };
    }
  }

  // ③ インサイト
  const params = new URLSearchParams({
    access_token: token,
    level: 'campaign',
    time_increment: '1',
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    fields: 'campaign_id,campaign_name,objective,spend,impressions,clicks,actions,date_start',
    action_attribution_windows: '7d_click,1d_view',
    limit: '500',
  });
  const insightsRes = await fetch(`${BASE}/${adAccountId}/insights?${params}`);
  const insightsData = await insightsRes.json();
  const insights = insightsData.data || [];
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

    // キャンペーンをupsert
    const { data: campaignRow } = await sb.from('campaigns').upsert(
      { campaign_name: campaignName, meta_campaign_id: metaCampaignId, status, is_active: true, updated_at: new Date().toISOString() },
      { onConflict: 'meta_campaign_id' }
    ).select('campaign_id').single();
    const internalCampaignId = campaignRow?.campaign_id;
    if (!internalCampaignId) continue;

    // メトリクスをupsert
    await sb.from('daily_metrics').upsert(
      { campaign_id: internalCampaignId, date, spend, impressions, clicks, conversions_meta: conversions, data_source: 'meta_api', updated_at: new Date().toISOString() },
      { onConflict: 'campaign_id,date' }
    );
    savedCount++;
  }

  // ステータスのみ更新（インサイトに出てこなかったキャンペーン）
  for (const [metaId, status] of Object.entries(campaignStatusMap)) {
    await sb.from('campaigns').update({ status, updated_at: new Date().toISOString() }).eq('meta_campaign_id', metaId);
  }

  return savedCount;
}

export function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
