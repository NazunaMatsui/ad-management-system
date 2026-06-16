const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

const uploadsDir = path.join(__dirname, '..', 'uploads', 'creatives');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `creative_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('画像ファイルのみアップロード可能です'));
  },
});

// 一覧取得
router.get('/', async (req, res) => {
  try {
    const { campaign_id } = req.query;
    let query = `
      SELECT cr.*, c.campaign_name
      FROM creatives cr
      LEFT JOIN campaigns c ON cr.campaign_id = c.campaign_id
    `;
    const params = [];
    if (campaign_id) {
      query += ' WHERE cr.campaign_id = $1';
      params.push(campaign_id);
    }
    query += ' ORDER BY cr.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'データ取得に失敗しました' });
  }
});

// 1件取得
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.*, c.campaign_name FROM creatives cr
       LEFT JOIN campaigns c ON cr.campaign_id = c.campaign_id
       WHERE cr.creative_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '見つかりません' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'データ取得に失敗しました' });
  }
});

// 作成（画像アップロード対応）
router.post('/', upload.single('image'), async (req, res) => {
  const { campaign_id, name, headline, body_text, status } = req.body;
  if (!name) return res.status(400).json({ error: 'クリエイティブ名は必須です' });
  const image_url = req.file ? `/uploads/creatives/${req.file.filename}` : '';
  try {
    const result = await pool.query(
      `INSERT INTO creatives (campaign_id, name, headline, body_text, image_url, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [campaign_id || null, name, headline || '', body_text || '', image_url, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '作成に失敗しました' });
  }
});

// 更新（画像アップロード対応）
router.put('/:id', upload.single('image'), async (req, res) => {
  const { campaign_id, name, headline, body_text, status } = req.body;
  try {
    // 既存レコードを取得
    const existing = await pool.query('SELECT image_url FROM creatives WHERE creative_id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: '見つかりません' });

    let image_url = existing.rows[0].image_url;

    if (req.file) {
      // 古いファイルを削除
      if (image_url) {
        const oldPath = path.join(__dirname, '..', image_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      image_url = `/uploads/creatives/${req.file.filename}`;
    }

    const result = await pool.query(
      `UPDATE creatives SET campaign_id=$1, name=$2, headline=$3, body_text=$4,
       image_url=$5, status=$6, updated_at=CURRENT_TIMESTAMP
       WHERE creative_id=$7 RETURNING *`,
      [campaign_id || null, name, headline || '', body_text || '', image_url, status || 'active', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '更新に失敗しました' });
  }
});

// 削除
router.delete('/:id', async (req, res) => {
  try {
    const existing = await pool.query('SELECT image_url FROM creatives WHERE creative_id = $1', [req.params.id]);
    if (existing.rows.length > 0 && existing.rows[0].image_url) {
      const filePath = path.join(__dirname, '..', existing.rows[0].image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM creatives WHERE creative_id = $1', [req.params.id]);
    res.json({ message: '削除しました' });
  } catch (err) {
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

module.exports = router;
