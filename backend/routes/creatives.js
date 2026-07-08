const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { supabase, BUCKET } = require('../config/supabase');

router.use(authenticateToken);

const uploadsDir = path.join(__dirname, '..', 'uploads', 'creatives');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('画像ファイルのみアップロード可能です'));
  },
});

async function uploadToStorage(file) {
  const ext = path.extname(file.originalname);
  const filename = `creative_${Date.now()}${ext}`;

  if (supabase) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  }

  // フォールバック: ローカルディスク
  const localPath = path.join(uploadsDir, filename);
  fs.writeFileSync(localPath, file.buffer);
  return `/uploads/creatives/${filename}`;
}

async function deleteFromStorage(url) {
  if (!url) return;
  if (supabase && (url.startsWith('http://') || url.startsWith('https://'))) {
    const filename = url.split('/').pop();
    await supabase.storage.from(BUCKET).remove([filename]);
  } else if (url.startsWith('/uploads/')) {
    const p = path.join(__dirname, '..', url);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

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

// 作成
router.post('/', upload.single('image'), async (req, res) => {
  const { campaign_id, name, headline, body_text, status } = req.body;
  if (!name) return res.status(400).json({ error: 'クリエイティブ名は必須です' });
  try {
    const image_url = req.file ? await uploadToStorage(req.file) : '';
    const result = await pool.query(
      `INSERT INTO creatives (campaign_id, name, headline, body_text, image_url, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [campaign_id || null, name, headline || '', body_text || '', image_url, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '作成に失敗しました: ' + err.message });
  }
});

// 更新
router.put('/:id', upload.single('image'), async (req, res) => {
  const { campaign_id, name, headline, body_text, status } = req.body;
  try {
    const existing = await pool.query('SELECT image_url FROM creatives WHERE creative_id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: '見つかりません' });

    let image_url = existing.rows[0].image_url;
    if (req.file) {
      await deleteFromStorage(image_url);
      image_url = await uploadToStorage(req.file);
    }

    const result = await pool.query(
      `UPDATE creatives SET campaign_id=$1, name=$2, headline=$3, body_text=$4,
       image_url=$5, status=$6, updated_at=CURRENT_TIMESTAMP
       WHERE creative_id=$7 RETURNING *`,
      [campaign_id || null, name, headline || '', body_text || '', image_url, status || 'active', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '更新に失敗しました: ' + err.message });
  }
});

// 削除
router.delete('/:id', async (req, res) => {
  try {
    const existing = await pool.query('SELECT image_url FROM creatives WHERE creative_id = $1', [req.params.id]);
    if (existing.rows.length > 0) {
      await deleteFromStorage(existing.rows[0].image_url);
    }
    await pool.query('DELETE FROM creatives WHERE creative_id = $1', [req.params.id]);
    res.json({ message: '削除しました' });
  } catch (err) {
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

module.exports = router;
