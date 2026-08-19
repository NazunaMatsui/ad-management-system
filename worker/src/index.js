import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import metricRoutes from './routes/metrics.js';
import memoRoutes from './routes/memos.js';
import metaRoutes from './routes/meta.js';
import chatRoutes from './routes/chat.js';
import creativeRoutes from './routes/creatives.js';
import creativeAssetsRoutes from './routes/creativeAssets.js';
import { syncMetaData, daysAgoStr, todayStr } from './jobs/metaSync.js';

const app = new Hono();

// CORS（許可オリジンを限定）
const ALLOWED_ORIGINS = [
  'https://ad-management-frontend.pages.dev',
  'http://localhost:3000',
  'http://localhost:5173',
];
app.use('*', cors({
  origin: (origin) => ALLOWED_ORIGINS.includes(origin) ? origin : null,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ルート
app.route('/api/auth', authRoutes);
app.route('/api/campaigns', campaignRoutes);
app.route('/api/metrics', metricRoutes);
app.route('/api/memos', memoRoutes);
app.route('/api/meta', metaRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/creatives', creativeRoutes);
app.route('/api/creative-assets', creativeAssetsRoutes);

// ヘルスチェック
app.get('/health', (c) => c.json({ status: 'OK', message: '広告費管理システムAPI稼働中' }));

// 404
app.notFound((c) => c.json({ error: 'エンドポイントが見つかりません' }, 404));

export default {
  // HTTPリクエスト処理
  fetch: app.fetch,

  // Cronトリガー（毎日09:00 JST = UTC 00:00）
  async scheduled(event, env, ctx) {
    const since = daysAgoStr(7);
    const today = todayStr();
    console.log(`[自動同期] 開始: ${since} 〜 ${today}`);
    try {
      const count = await syncMetaData(since, today, env);
      console.log(`[自動同期] 完了: ${count}件`);
    } catch (err) {
      console.error('[自動同期] エラー:', err.message);
    }
  },
};
