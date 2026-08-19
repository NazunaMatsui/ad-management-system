import { Hono } from 'hono';
import { authMiddleware } from '../lib/auth.js';
import { syncMetaData } from '../jobs/metaSync.js';

const router = new Hono();
router.use('*', authMiddleware());

const META_API_VERSION = 'v19.0';

// Meta APIデータ同期
router.post('/sync', async (c) => {
  const { start_date, end_date } = await c.req.json();
  if (!start_date || !end_date) return c.json({ error: 'start_date と end_date を指定してください' }, 400);
  try {
    const count = await syncMetaData(start_date, end_date, c.env);
    return c.json({ message: `${count}件のデータを同期しました`, synced: count, period: { start_date, end_date } });
  } catch (e) {
    console.error('Meta API同期エラー:', e);
    return c.json({ error: 'Meta APIの同期に失敗しました', detail: e.message }, 500);
  }
});

// 接続テスト
router.get('/test', async (c) => {
  const token = c.env.META_ACCESS_TOKEN;
  const adAccountId = c.env.META_AD_ACCOUNT_ID;
  const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
  try {
    const res = await fetch(`${BASE_URL}/${adAccountId}?access_token=${token}&fields=id,name,currency,account_status`);
    const data = await res.json();
    if (data.error) return c.json({ success: false, error: `${data.error.message} (code: ${data.error.code})` }, 500);
    return c.json({ success: true, account: data });
  } catch (e) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default router;
