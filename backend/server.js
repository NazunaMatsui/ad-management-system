const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ルーター
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const metricRoutes = require('./routes/metrics');
const memoRoutes = require('./routes/memos');
const metaRoutes = require('./routes/meta');

// API エンドポイント
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/memos', memoRoutes);
app.use('/api/meta', metaRoutes);

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

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 サーバーがポート${PORT}で起動しました`);
  console.log(`📊 広告費管理システムAPI稼働中`);
  console.log(`🌐 http://localhost:${PORT}`);
});

module.exports = app;
