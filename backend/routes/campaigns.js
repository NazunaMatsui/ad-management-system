const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// すべて認証必須
router.use(authenticateToken);

// キャンペーン一覧取得
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM campaigns ORDER BY
        CASE status WHEN 'active' THEN 1 WHEN 'testing' THEN 2 WHEN 'paused' THEN 3 ELSE 4 END,
        campaign_id`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('キャンペーン取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// キャンペーン詳細取得
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM campaigns WHERE campaign_id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'キャンペーンが見つかりません' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('キャンペーン詳細取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// キャンペーン作成
router.post('/', async (req, res) => {
  const { campaign_name, meta_campaign_id, is_group, parent_campaign_id } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO campaigns (campaign_name, meta_campaign_id, is_group, parent_campaign_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [campaign_name, meta_campaign_id, is_group || false, parent_campaign_id || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('キャンペーン作成エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// キャンペーン更新
router.put('/:id', async (req, res) => {
  const { campaign_name, meta_campaign_id, is_group, parent_campaign_id, is_active, status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE campaigns SET campaign_name = $1, meta_campaign_id = $2, is_group = $3, parent_campaign_id = $4, is_active = $5, status = COALESCE($7, status), updated_at = CURRENT_TIMESTAMP WHERE campaign_id = $6 RETURNING *',
      [campaign_name, meta_campaign_id, is_group, parent_campaign_id, is_active, req.params.id, status || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'キャンペーンが見つかりません' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('キャンペーン更新エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// ステータスのみ更新
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'paused', 'testing', 'ended'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: '無効なステータスです' });
  }
  try {
    const result = await pool.query(
      'UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'キャンペーンが見つかりません' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('ステータス更新エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// キャンペーン削除（論理削除）
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE campaigns SET is_active = false WHERE campaign_id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'キャンペーンが見つかりません' });
    }
    
    res.json({ message: 'キャンペーンを削除しました' });
  } catch (error) {
    console.error('キャンペーン削除エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
