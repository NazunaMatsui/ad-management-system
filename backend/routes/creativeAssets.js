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
    cb(null, `media_${Date.now()}_${Math.random().toString(36).slice(2,6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype) || /^video\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('画像または動画ファイルのみアップロード可能です'));
  },
});

const uploadFields = upload.fields([
  { name: 'media1', maxCount: 1 },
  { name: 'media2', maxCount: 1 },
  { name: 'media3', maxCount: 1 },
]);

function deleteFile(url) {
  if (!url) return;
  const p = path.join(__dirname, '..', url);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// ─── 画像/動画 ────────────────────────────────────────────────────────────────

router.get('/images', async (req, res) => {
  try {
    const { search, store } = req.query;
    const params = [];
    const conds = [];
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(name ILIKE $${params.length} OR tags ILIKE $${params.length} OR memo ILIKE $${params.length})`);
    }
    if (store && store !== 'all') {
      params.push(store);
      conds.push(`store = $${params.length}`);
    }
    const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
    const result = await pool.query('SELECT * FROM creative_images' + where + ' ORDER BY created_at DESC', params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'データ取得に失敗しました' });
  }
});

router.post('/images', uploadFields, async (req, res) => {
  try {
    const { name, memo, tags, store, size_label_1, size_label_2, size_label_3 } = req.body;
    if (!name) return res.status(400).json({ error: '名前は必須です' });
    const f1 = req.files?.media1?.[0];
    if (!f1) return res.status(400).json({ error: '1枚目の画像/動画は必須です' });
    const f2 = req.files?.media2?.[0];
    const f3 = req.files?.media3?.[0];
    const media_type = /^video\//.test(f1.mimetype) ? 'video' : 'image';
    const url1 = `/uploads/creatives/${f1.filename}`;
    const url2 = f2 ? `/uploads/creatives/${f2.filename}` : null;
    const url3 = f3 ? `/uploads/creatives/${f3.filename}` : null;
    const result = await pool.query(
      `INSERT INTO creative_images
        (name, image_url, image_url_2, image_url_3, size_label_1, size_label_2, size_label_3, media_type, memo, tags, store)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, url1, url2, url3,
       size_label_1 || 'スクエア(1:1)', size_label_2 || 'ストーリー(9:16)', size_label_3 || '横型(16:9)',
       media_type, memo || null, tags || null, store || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '登録に失敗しました' });
  }
});

router.put('/images/:id', uploadFields, async (req, res) => {
  try {
    const { name, memo, tags, store, size_label_1, size_label_2, size_label_3 } = req.body;
    const { id } = req.params;
    const old = await pool.query('SELECT * FROM creative_images WHERE id=$1', [id]);
    const row = old.rows[0];
    if (!row) return res.status(404).json({ error: '見つかりません' });

    const f1 = req.files?.media1?.[0];
    const f2 = req.files?.media2?.[0];
    const f3 = req.files?.media3?.[0];

    let url1 = row.image_url, url2 = row.image_url_2, url3 = row.image_url_3;
    let media_type = row.media_type;

    if (f1) {
      deleteFile(row.image_url);
      url1 = `/uploads/creatives/${f1.filename}`;
      media_type = /^video\//.test(f1.mimetype) ? 'video' : 'image';
    }
    if (f2) { deleteFile(row.image_url_2); url2 = `/uploads/creatives/${f2.filename}`; }
    if (f3) { deleteFile(row.image_url_3); url3 = `/uploads/creatives/${f3.filename}`; }

    // handle explicit clear of slot 2/3
    if (req.body.clear2 === '1') { deleteFile(url2); url2 = null; }
    if (req.body.clear3 === '1') { deleteFile(url3); url3 = null; }

    const result = await pool.query(
      `UPDATE creative_images SET
        name=$1, memo=$2, tags=$3, store=$4,
        image_url=$5, image_url_2=$6, image_url_3=$7,
        size_label_1=$8, size_label_2=$9, size_label_3=$10,
        media_type=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [name, memo || null, tags || null, store || null,
       url1, url2, url3,
       size_label_1 || row.size_label_1, size_label_2 || row.size_label_2, size_label_3 || row.size_label_3,
       media_type, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新に失敗しました' });
  }
});

router.delete('/images/:id', async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM creative_images WHERE id=$1', [req.params.id]);
    if (old.rows[0]) {
      deleteFile(old.rows[0].image_url);
      deleteFile(old.rows[0].image_url_2);
      deleteFile(old.rows[0].image_url_3);
    }
    await pool.query('DELETE FROM creative_images WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

// ─── 広告文 ──────────────────────────────────────────────────────────────────

router.get('/texts', async (req, res) => {
  try {
    const { search, store } = req.query;
    const params = [];
    const conds = [];
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(name ILIKE $${params.length} OR headline ILIKE $${params.length} OR body_text ILIKE $${params.length} OR tags ILIKE $${params.length})`);
    }
    if (store && store !== 'all') {
      params.push(store);
      conds.push(`store = $${params.length}`);
    }
    const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
    const result = await pool.query('SELECT * FROM creative_texts' + where + ' ORDER BY created_at DESC', params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'データ取得に失敗しました' });
  }
});

router.post('/texts', async (req, res) => {
  try {
    const { name, headline, body_text, memo, tags, store } = req.body;
    if (!name) return res.status(400).json({ error: '名前は必須です' });
    const result = await pool.query(
      'INSERT INTO creative_texts (name, headline, body_text, memo, tags, store) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, headline || null, body_text || null, memo || null, tags || null, store || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '登録に失敗しました' });
  }
});

router.put('/texts/:id', async (req, res) => {
  try {
    const { name, headline, body_text, memo, tags, store } = req.body;
    const result = await pool.query(
      'UPDATE creative_texts SET name=$1,headline=$2,body_text=$3,memo=$4,tags=$5,store=$6,updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, headline || null, body_text || null, memo || null, tags || null, store || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '更新に失敗しました' });
  }
});

router.delete('/texts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM creative_texts WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

module.exports = router;
