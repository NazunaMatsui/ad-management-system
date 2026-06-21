const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));

// ルーター
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const metricRoutes = require('./routes/metrics');
const memoRoutes = require('./routes/memos');
const metaRoutes = require('./routes/meta');
const chatRoutes = require('./routes/chat');
const creativeRoutes = require('./routes/creatives');
const creativeAssetsRoutes = require('./routes/creativeAssets');
const { startScheduler } = require('./jobs/metaSync');

// API エンドポイント
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/memos', memoRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/creatives', creativeRoutes);
app.use('/api/creative-assets', creativeAssetsRoutes);

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: '広告費管理システムAPI稼働中' });
});

// 404エラー
app.use((req, res) => {
  res.status(404).json({ error: 'エンドポイントが見つかりません' });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

// DBマイグレーション
const pool = require('./config/database');
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_password TEXT`).catch(() => {});

// サーバー起動
app.listen(PORT, () => {
  startScheduler();
  console.log(`🚀 サーバーがポート${PORT}で起動しました`);
  console.log(`📊 広告費管理システムAPI稼働中`);
  console.log(`🌐 http://localhost:${PORT}`);
});

module.exports = app;
