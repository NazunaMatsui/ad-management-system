import { Hono } from 'hono';
import { authMiddleware } from '../lib/auth.js';
import { getSupabase } from '../lib/supabase.js';

const router = new Hono();
router.use('*', authMiddleware());

const STATUS_ORDER = { active: 1, testing: 2, paused: 3 };

// キャンペーン一覧取得
router.get('/', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('campaigns').select('*');
    if (error) throw error;
    const sorted = (data || []).sort((a, b) => {
      const oa = STATUS_ORDER[a.status] || 4;
      const ob = STATUS_ORDER[b.status] || 4;
      return oa !== ob ? oa - ob : a.campaign_id - b.campaign_id;
    });
    return c.json(sorted);
  } catch (e) {
    console.error('キャンペーン取得エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// キャンペーン詳細取得
router.get('/:id', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('campaigns').select('*').eq('campaign_id', c.req.param('id')).single();
    if (error || !data) return c.json({ error: 'キャンペーンが見つかりません' }, 404);
    return c.json(data);
  } catch (e) {
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// キャンペーン作成
router.post('/', async (c) => {
  const { campaign_name, meta_campaign_id, is_group, parent_campaign_id } = await c.req.json();
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('campaigns')
      .insert({ campaign_name, meta_campaign_id, is_group: is_group || false, parent_campaign_id: parent_campaign_id || null })
      .select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (e) {
    console.error('キャンペーン作成エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// キャンペーン更新
router.put('/:id', async (c) => {
  const { campaign_name, meta_campaign_id, is_group, parent_campaign_id, is_active, status } = await c.req.json();
  const sb = getSupabase(c.env);
  try {
    const updates = { campaign_name, meta_campaign_id, is_group, parent_campaign_id, is_active, updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    const { data, error } = await sb.from('campaigns').update(updates).eq('campaign_id', c.req.param('id')).select().single();
    if (error || !data) return c.json({ error: 'キャンペーンが見つかりません' }, 404);
    return c.json(data);
  } catch (e) {
    console.error('キャンペーン更新エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// ステータスのみ更新
router.patch('/:id/status', async (c) => {
  const { status } = await c.req.json();
  const allowed = ['active', 'paused', 'testing', 'ended'];
  if (!allowed.includes(status)) return c.json({ error: '無効なステータスです' }, 400);
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('campaign_id', c.req.param('id')).select().single();
    if (error || !data) return c.json({ error: 'キャンペーンが見つかりません' }, 404);
    return c.json(data);
  } catch (e) {
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// キャンペーン削除（論理削除）
router.delete('/:id', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('campaigns')
      .update({ is_active: false }).eq('campaign_id', c.req.param('id')).select().single();
    if (error || !data) return c.json({ error: 'キャンペーンが見つかりません' }, 404);
    return c.json({ message: 'キャンペーンを削除しました' });
  } catch (e) {
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

export default router;
