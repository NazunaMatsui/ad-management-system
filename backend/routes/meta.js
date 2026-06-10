const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { syncMetaData } = require('../jobs/metaSync');

router.use(authenticateToken);

const META_API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Meta APIから指定期間のデータを取得してDBに保存
router.post('/sync', async (req, res) => {
  const { start_date, end_date } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date と end_date を指定してください' });
  }

  try {
    const count = await syncMetaData(start_date, end_date);
    res.json({
      message: `${count}件のデータを同期しました`,
      synced: count,
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
