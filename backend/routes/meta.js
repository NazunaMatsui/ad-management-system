const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

const META_API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Meta APIから指定期間のデータを取得してDBに保存
router.post('/sync', async (req, res) => {
  const { start_date, end_date } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date と end_date を指定してください' });
  }

  const token = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !adAccountId) {
    return res.status(500).json({ error: 'Meta APIの認証情報が設定されていません' });
  }

  try {
    // キャンペーン別・日別のインサイトを取得
    const insightsUrl = `${BASE_URL}/${adAccountId}/insights`;
    const response = await axios.get(insightsUrl, {
      params: {
        access_token: token,
        level: 'campaign',
        time_increment: 1,
        time_range: JSON.stringify({ since: start_date, until: end_date }),
        fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions,date_start',
        limit: 500,
      },
    });

    const insights = response.data.data || [];
    const savedRows = [];

    for (const row of insights) {
      const metaCampaignId = row.campaign_id;
      const campaignName = row.campaign_name;
      const date = row.date_start;
      const spend = parseFloat(row.spend || 0);
      const impressions = parseInt(row.impressions || 0);
      const clicks = parseInt(row.clicks || 0);

      // actions から conversions を抽出
      const actions = row.actions || [];
      const conversions = actions
        .filter(a => a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'purchase')
        .reduce((sum, a) => sum + parseInt(a.value || 0), 0);

      // meta_campaign_id で内部 campaign_id を取得 or 新規作成
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

      // daily_metrics に upsert
      const result = await pool.query(
        `INSERT INTO daily_metrics (campaign_id, date, spend, impressions, clicks, conversions_meta, data_source)
         VALUES ($1, $2, $3, $4, $5, $6, 'meta_api')
         ON CONFLICT (campaign_id, date) DO UPDATE SET
           spend = EXCLUDED.spend,
           impressions = EXCLUDED.impressions,
           clicks = EXCLUDED.clicks,
           conversions_meta = EXCLUDED.conversions_meta,
           data_source = 'meta',
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [internalCampaignId, date, spend, impressions, clicks, conversions]
      );

      savedRows.push(result.rows[0]);
    }

    res.json({
      message: `${savedRows.length}件のデータを同期しました`,
      synced: savedRows.length,
      period: { start_date, end_date },
    });
  } catch (error) {
    console.error('Meta API同期エラー:', error.response?.data || error.message);
    const metaError = error.response?.data?.error;
    res.status(500).json({
      error: 'Meta APIの同期に失敗しました',
      detail: metaError ? `${metaError.message} (code: ${metaError.code})` : error.message,
    });
  }
});

// 接続テスト
router.get('/test', async (req, res) => {
  const token = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  try {
    const response = await axios.get(`${BASE_URL}/${adAccountId}`, {
      params: {
        access_token: token,
        fields: 'id,name,currency,account_status',
      },
    });
    res.json({ success: true, account: response.data });
  } catch (error) {
    const metaError = error.response?.data?.error;
    res.status(500).json({
      success: false,
      error: metaError ? `${metaError.message} (code: ${metaError.code})` : error.message,
    });
  }
});

module.exports = router;
