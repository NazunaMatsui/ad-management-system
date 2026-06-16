const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// メモ一覧取得（期間・キャンペーン指定）
router.get('/', async (req, res) => {
  const { start_date, end_date, campaign_id } = req.query;
  
  try {
    let query = `
      SELECT 
        om.*,
        c.campaign_name,
        u.username as created_by_name
      FROM operation_memos om
      JOIN campaigns c ON om.campaign_id = c.campaign_id
      JOIN users u ON om.created_by = u.user_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (start_date) {
      query += ` AND om.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      query += ` AND om.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    if (campaign_id) {
      query += ` AND om.campaign_id = $${paramCount}`;
      params.push(campaign_id);
      paramCount++;
    }
    
    query += ' ORDER BY om.date DESC, om.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('メモ取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// メモ詳細取得
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        om.*,
        c.campaign_name,
        u.username as created_by_name
      FROM operation_memos om
      JOIN campaigns c ON om.campaign_id = c.campaign_id
      JOIN users u ON om.created_by = u.user_id
      WHERE om.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'メモが見つかりません' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('メモ詳細取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// メモ作成
router.post('/', async (req, res) => {
  const { campaign_id, date, memo_content } = req.body;
  
  if (!campaign_id || !date || !memo_content) {
    return res.status(400).json({ error: '必須項目を入力してください' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO operation_memos (campaign_id, date, memo_content, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [campaign_id, date, memo_content, req.user.userId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('メモ作成エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// メモ更新（変更前の内容を履歴に保存）
router.put('/:id', async (req, res) => {
  const { campaign_id, date, memo_content } = req.body;

  try {
    // 変更前の内容を取得して履歴に保存
    const before = await pool.query('SELECT * FROM operation_memos WHERE id = $1', [req.params.id]);
    if (before.rows.length > 0) {
      const old = before.rows[0];
      await pool.query(
        `INSERT INTO memo_history (memo_id, campaign_id, date, memo_content, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [old.id, old.campaign_id, old.date, old.memo_content, req.user.userId]
      );
    }

    const result = await pool.query(
      `UPDATE operation_memos
       SET campaign_id = $1, date = $2, memo_content = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [campaign_id, date, memo_content, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'メモが見つかりません' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('メモ更新エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// メモ削除（削除前の内容を履歴に保存）
router.delete('/:id', async (req, res) => {
  try {
    const before = await pool.query('SELECT * FROM operation_memos WHERE id = $1', [req.params.id]);
    if (before.rows.length === 0) {
      return res.status(404).json({ error: 'メモが見つかりません' });
    }
    const old = before.rows[0];
    await pool.query(
      `INSERT INTO memo_history (memo_id, campaign_id, date, memo_content, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [old.id, old.campaign_id, old.date, `[削除] ${old.memo_content}`, req.user.userId]
    );

    await pool.query('DELETE FROM operation_memos WHERE id = $1', [req.params.id]);
    res.json({ message: 'メモを削除しました' });
  } catch (error) {
    console.error('メモ削除エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// メモ履歴取得
router.get('/:id/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mh.*, u.username as changed_by_name
       FROM memo_history mh
       LEFT JOIN users u ON mh.changed_by = u.user_id
       WHERE mh.memo_id = $1
       ORDER BY mh.changed_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('履歴取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
