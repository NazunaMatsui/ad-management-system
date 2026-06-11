const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 日次指標取得（期間・キャンペーン指定）
router.get('/', async (req, res) => {
  const { start_date, end_date, campaign_id, campaign_ids } = req.query;

  try {
    let query = 'SELECT dm.*, c.campaign_name FROM daily_metrics dm JOIN campaigns c ON dm.campaign_id = c.campaign_id WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (start_date) {
      query += ` AND dm.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND dm.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (campaign_ids) {
      const ids = campaign_ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        query += ` AND dm.campaign_id = ANY(string_to_array($${paramCount}, ',')::int[])`;
        params.push(ids.join(','));
        paramCount++;
      }
    } else if (campaign_id) {
      query += ` AND dm.campaign_id = $${paramCount}`;
      params.push(campaign_id);
      paramCount++;
    }

    query += ' ORDER BY dm.date DESC, dm.campaign_id';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('指標取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 集計データ取得（期間合算）
router.get('/summary', async (req, res) => {
  const { start_date, end_date, campaign_id, campaign_ids } = req.query;

  try {
    let query = `
      SELECT
        c.campaign_id,
        c.campaign_name,
        SUM(dm.spend) as total_spend,
        SUM(dm.impressions) as total_impressions,
        SUM(dm.clicks) as total_clicks,
        SUM(dm.conversions_meta) as total_conversions_meta,
        SUM(dm.conversions_booking) as total_conversions_booking,
        CASE
          WHEN SUM(dm.conversions_booking) > 0
          THEN SUM(dm.spend) / SUM(dm.conversions_booking)
          ELSE 0
        END as avg_cpa,
        CASE
          WHEN SUM(dm.clicks) > 0
          THEN SUM(dm.spend) / SUM(dm.clicks)
          ELSE 0
        END as avg_cpc,
        CASE
          WHEN SUM(dm.impressions) > 0
          THEN (SUM(dm.clicks)::DECIMAL / SUM(dm.impressions) * 100)
          ELSE 0
        END as avg_ctr,
        CASE
          WHEN SUM(dm.clicks) > 0
          THEN (SUM(dm.conversions_meta + dm.conversions_booking)::DECIMAL / SUM(dm.clicks) * 100)
          ELSE 0
        END as avg_cvr
      FROM daily_metrics dm
      JOIN campaigns c ON dm.campaign_id = c.campaign_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (start_date) {
      query += ` AND dm.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND dm.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (campaign_ids) {
      const ids = campaign_ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        query += ` AND dm.campaign_id = ANY(string_to_array($${paramCount}, ',')::int[])`;
        params.push(ids.join(','));
        paramCount++;
      }
    } else if (campaign_id) {
      query += ` AND dm.campaign_id = $${paramCount}`;
      params.push(campaign_id);
      paramCount++;
    }

    query += ' GROUP BY c.campaign_id, c.campaign_name ORDER BY c.campaign_id';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('集計データ取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 期間比較データ取得
router.get('/compare', async (req, res) => {
  const { start_date_a, end_date_a, start_date_b, end_date_b, campaign_id } = req.query;
  
  if (!start_date_a || !end_date_a || !start_date_b || !end_date_b) {
    return res.status(400).json({ error: '比較期間を指定してください' });
  }
  
  try {
    const getSummary = async (startDate, endDate, campaignId) => {
      let query = `
        SELECT 
          SUM(spend) as total_spend,
          SUM(impressions) as total_impressions,
          SUM(clicks) as total_clicks,
          SUM(conversions_meta) as total_conversions_meta,
          SUM(conversions_booking) as total_conversions_booking,
          CASE
            WHEN SUM(conversions_booking) > 0
            THEN SUM(spend) / SUM(conversions_booking)
            ELSE 0
          END as avg_cpa,
          CASE 
            WHEN SUM(clicks) > 0 
            THEN SUM(spend) / SUM(clicks)
            ELSE 0 
          END as avg_cpc,
          CASE 
            WHEN SUM(impressions) > 0 
            THEN (SUM(clicks)::DECIMAL / SUM(impressions) * 100)
            ELSE 0 
          END as avg_ctr,
          CASE 
            WHEN SUM(clicks) > 0 
            THEN (SUM(conversions_meta + conversions_booking)::DECIMAL / SUM(clicks) * 100)
            ELSE 0 
          END as avg_cvr
        FROM daily_metrics
        WHERE date >= $1 AND date <= $2
      `;
      
      const params = [startDate, endDate];
      
      if (campaignId) {
        query += ' AND campaign_id = $3';
        params.push(campaignId);
      }
      
      const result = await pool.query(query, params);
      return result.rows[0];
    };
    
    const periodA = await getSummary(start_date_a, end_date_a, campaign_id);
    const periodB = await getSummary(start_date_b, end_date_b, campaign_id);
    
    // 差分計算
    const comparison = {
      period_a: periodA,
      period_b: periodB,
      differences: {
        spend_diff: periodB.total_spend - periodA.total_spend,
        spend_diff_percent: periodA.total_spend > 0 ? ((periodB.total_spend - periodA.total_spend) / periodA.total_spend * 100) : 0,
        impressions_diff: periodB.total_impressions - periodA.total_impressions,
        impressions_diff_percent: periodA.total_impressions > 0 ? ((periodB.total_impressions - periodA.total_impressions) / periodA.total_impressions * 100) : 0,
        clicks_diff: periodB.total_clicks - periodA.total_clicks,
        clicks_diff_percent: periodA.total_clicks > 0 ? ((periodB.total_clicks - periodA.total_clicks) / periodA.total_clicks * 100) : 0,
        conversions_meta_diff: periodB.total_conversions_meta - periodA.total_conversions_meta,
        conversions_meta_diff_percent: periodA.total_conversions_meta > 0 ? ((periodB.total_conversions_meta - periodA.total_conversions_meta) / periodA.total_conversions_meta * 100) : 0,
        conversions_booking_diff: periodB.total_conversions_booking - periodA.total_conversions_booking,
        conversions_booking_diff_percent: periodA.total_conversions_booking > 0 ? ((periodB.total_conversions_booking - periodA.total_conversions_booking) / periodA.total_conversions_booking * 100) : 0,
        cpa_diff: periodB.avg_cpa - periodA.avg_cpa,
        cpa_diff_percent: periodA.avg_cpa > 0 ? ((periodB.avg_cpa - periodA.avg_cpa) / periodA.avg_cpa * 100) : 0,
        cpc_diff: periodB.avg_cpc - periodA.avg_cpc,
        cpc_diff_percent: periodA.avg_cpc > 0 ? ((periodB.avg_cpc - periodA.avg_cpc) / periodA.avg_cpc * 100) : 0,
        ctr_diff: periodB.avg_ctr - periodA.avg_ctr,
        cvr_diff: periodB.avg_cvr - periodA.avg_cvr
      }
    };
    
    res.json(comparison);
  } catch (error) {
    console.error('期間比較エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 日次指標登録・更新
router.post('/', async (req, res) => {
  const { 
    campaign_id, 
    date, 
    spend, 
    impressions, 
    clicks, 
    conversions_meta, 
    conversions_booking,
    data_source 
  } = req.body;
  
  try {
    const result = await pool.query(`
      INSERT INTO daily_metrics 
        (campaign_id, date, spend, impressions, clicks, conversions_meta, conversions_booking, data_source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (campaign_id, date) 
      DO UPDATE SET 
        spend = EXCLUDED.spend,
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        conversions_meta = EXCLUDED.conversions_meta,
        conversions_booking = EXCLUDED.conversions_booking,
        data_source = EXCLUDED.data_source,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [campaign_id, date, spend, impressions, clicks, conversions_meta, conversions_booking, data_source || 'manual']);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('指標登録エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 日次指標削除
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM daily_metrics WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '指標が見つかりません' });
    }
    
    res.json({ message: '指標を削除しました' });
  } catch (error) {
    console.error('指標削除エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
