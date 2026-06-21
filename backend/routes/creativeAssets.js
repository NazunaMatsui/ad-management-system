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
    cb(null, `img_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('画像ファイルのみアップロード可能です'));
  },
});

// ─── 画像 ───────────────────────────────────────────

// 一覧
router.get('/images', async (req, res) => {
  try {
    const { search } = req.query;
    let q = 'SELECT * FROM creative_images';
    const params = [];
    if (search) {
      q += ' WHERE name ILIKE $1 OR tags ILIKE $1 OR memo ILIKE $1';
      params.push(`%${search}%`);
    }
    q += ' ORDER BY created_at DESC';
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'データ取得に失敗しました' });
  }
});

// 登録
router.post('/images', upload.single('image'), async (req, res) => {
  try {
    const { name, memo, tags } = req.body;
    if (!name) return res.status(400).json({ error: '名前は必須です' });
    if (!req.file) return res.status(400).json({ error: '画像は必須です' });
    const image_url = `/uploads/creatives/${req.file.filename}`;
    const result = await pool.query(
      'INSERT INTO creative_images (name, image_url, memo, tags) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, image_url, memo || null, tags || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '登録に失敗しました' });
  }
});

// 更新
router.put('/images/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, memo, tags } = req.body;
    const { id } = req.params;
    let image_url;
    if (req.file) {
      image_url = `/uploads/creatives/${req.file.filename}`;
      // 旧ファイル削除
      const old = await pool.query('SELECT image_url FROM creative_images WHERE id=$1', [id]);
      if (old.rows[0]?.image_url) {
        const oldPath = path.join(__dirname, '..', old.rows[0].image_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    const result = await pool.query(
      `UPDATE creative_images SET
        name=$1, memo=$2, tags=$3,
        ${image_url ? 'image_url=$4,' : ''}
        updated_at=NOW()
       WHERE id=${image_url ? '$5' : '$4'} RETURNING *`,
      image_url ? [name, memo || null, tags || null, image_url, id] : [name, memo || null, tags || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '更新に失敗しました' });
  }
});

// 削除
router.delete('/images/:id', async (req, res) => {
  try {
    const old = await pool.query('SELECT image_url FROM creative_images WHERE id=$1', [req.params.id]);
    if (old.rows[0]?.image_url) {
      const p = path.join(__dirname, '..', old.rows[0].image_url);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await pool.query('DELETE FROM creative_images WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

// ─── 広告文 ─────────────────────────────────────────

// 一覧
router.get('/texts', async (req, res) => {
  try {
    const { search } = req.query;
    let q = 'SELECT * FROM creative_texts';
    const params = [];
    if (search) {
      q += ' WHERE name ILIKE $1 OR headline ILIKE $1 OR body_text ILIKE $1 OR tags ILIKE $1';
      params.push(`%${search}%`);
    }
    q += ' ORDER BY created_at DESC';
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'データ取得に失敗しました' });
  }
});

// 登録
router.post('/texts', async (req, res) => {
  try {
    const { name, headline, body_text, memo, tags } = req.body;
    if (!name) return res.status(400).json({ error: '名前は必須です' });
    const result = await pool.query(
      'INSERT INTO creative_texts (name, headline, body_text, memo, tags) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, headline || null, body_text || null, memo || null, tags || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '登録に失敗しました' });
  }
});

// 更新
router.put('/texts/:id', async (req, res) => {
  try {
    const { name, headline, body_text, memo, tags } = req.body;
    const result = await pool.query(
      'UPDATE creative_texts SET name=$1,headline=$2,body_text=$3,memo=$4,tags=$5,updated_at=NOW() WHERE id=$6 RETURNING *',
      [name, headline || null, body_text || null, memo || null, tags || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '更新に失敗しました' });
  }
});

// 削除
router.delete('/texts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM creative_texts WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

module.exports = router;
