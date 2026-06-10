const cron = require('node-cron');
const axios = require('axios');
const pool = require('../config/database');

// 指定期間の Meta インサイトを取得して DB に保存する共通関数
async function syncMetaData(startDate, endDate) {
  const token = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !adAccountId) {
    throw new Error('Meta APIの認証情報が設定されていません');
  }

  const META_API_VERSION = 'v19.0';
  const insightsUrl = `https://graph.facebook.com/${META_API_VERSION}/${adAccountId}/insights`;

  const response = await axios.get(insightsUrl, {
    params: {
      access_token: token,
      level: 'campaign',
      time_increment: 1,
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions,date_start',
      limit: 500,
    },
  });

  const insights = response.data.data || [];
  let savedCount = 0;

  for (const row of insights) {
    const metaCampaignId = row.campaign_id;
    const campaignName = row.campaign_name;
    const date = row.date_start;
    const spend = parseFloat(row.spend || 0);
    const impressions = parseInt(row.impressions || 0);
    const clicks = parseInt(row.clicks || 0);

    const actions = row.actions || [];
    const conversions = actions
      .filter(a => a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'purchase')
      .reduce((sum, a) => sum + parseInt(a.value || 0), 0);

    const campaignRes = await pool.query(
      `INSERT INTO campaigns (campaign_name, meta_campaign_id, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (meta_campaign_id) DO UPDATE SET
         campaign_name = EXCLUDED.campaign_name,
         updated_at = CURRENT_TIMESTAMP
       RETURNING campaign_id`,
      [campaignName, metaCampaignId]
    );
    const internalCampaignId = campaignRes.rows[0].campaign_id;

    await pool.query(
      `INSERT INTO daily_metrics (campaign_id, date, spend, impressions, clicks, conversions_meta, data_source)
       VALUES ($1, $2, $3, $4, $5, $6, 'meta_api')
       ON CONFLICT (campaign_id, date) DO UPDATE SET
         spend = EXCLUDED.spend,
         impressions = EXCLUDED.impressions,
         clicks = EXCLUDED.clicks,
         conversions_meta = EXCLUDED.conversions_meta,
         data_source = 'meta_api',
         updated_at = CURRENT_TIMESTAMP`,
      [internalCampaignId, date, spend, impressions, clicks, conversions]
    );

    savedCount++;
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

// 毎朝9時に前日〜当日分を同期
function startScheduler() {
  if (process.env.AUTO_FETCH_ENABLED !== 'true') {
    console.log('自動同期は無効です（AUTO_FETCH_ENABLED=false）');
    return;
  }

  // 毎日 09:00 JST（UTC+9 なので UTC 00:00）
  cron.schedule('0 0 * * *', async () => {
    const yesterday = yesterdayStr();
    const today = todayStr();
    console.log(`[自動同期] 開始: ${yesterday} 〜 ${today}`);
    try {
      const count = await syncMetaData(yesterday, today);
      console.log(`[自動同期] 完了: ${count}件`);
    } catch (err) {
      console.error('[自動同期] エラー:', err.message);
    }
  }, {
    timezone: 'Asia/Tokyo',
  });

  console.log('自動同期スケジューラー起動済み（毎日 09:00 JST）');
}

module.exports = { syncMetaData, startScheduler };
