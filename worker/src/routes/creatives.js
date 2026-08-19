import { Hono } from 'hono';
import { authMiddleware } from '../lib/auth.js';
import { getSupabase } from '../lib/supabase.js';

const router = new Hono();
router.use('*', authMiddleware());

const BUCKET = 'creative-images';

async function uploadToStorage(sb, file) {
  const ext = file.name.split('.').pop();
  const filename = `creative_${Date.now()}.${ext}`;
  const buffer = await file.arrayBuffer();
  const { error } = await sb.storage.from(BUCKET).upload(filename, buffer, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function deleteFromStorage(sb, url) {
  if (!url || !url.startsWith('http')) return;
  const filename = url.split('/').pop();
  await sb.storage.from(BUCKET).remove([filename]);
}

// 一覧取得
router.get('/', async (c) => {
  const { campaign_id } = c.req.query();
  const sb = getSupabase(c.env);
  try {
    let query = sb.from('creatives').select('*, campaigns(campaign_name)').order('created_at', { ascending: false });
    if (campaign_id) query = query.eq('campaign_id', campaign_id);
    const { data, error } = await query;
    if (error) throw error;
    return c.json((data || []).map(r => ({ ...r, campaign_name: r.campaigns?.campaign_name })));
  } catch (e) {
    return c.json({ error: 'データ取得に失敗しました' }, 500);
  }
});

// 1件取得
router.get('/:id', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('creatives').select('*, campaigns(campaign_name)').eq('creative_id', c.req.param('id')).single();
    if (error || !data) return c.json({ error: '見つかりません' }, 404);
    return c.json({ ...data, campaign_name: data.campaigns?.campaign_name });
  } catch (e) {
    return c.json({ error: 'データ取得に失敗しました' }, 500);
  }
});

// 作成
router.post('/', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const formData = await c.req.formData();
    const campaign_id = formData.get('campaign_id');
    const name = formData.get('name');
    const headline = formData.get('headline') || '';
    const body_text = formData.get('body_text') || '';
    const status = formData.get('status') || 'active';
    if (!name) return c.json({ error: 'クリエイティブ名は必須です' }, 400);
    const imageFile = formData.get('image');
    const image_url = imageFile ? await uploadToStorage(sb, imageFile) : '';
    const { data, error } = await sb.from('creatives')
      .insert({ campaign_id: campaign_id || null, name, headline, body_text, image_url, status })
      .select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (e) {
    return c.json({ error: '作成に失敗しました: ' + e.message }, 500);
  }
});

// 更新
router.put('/:id', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const formData = await c.req.formData();
    const campaign_id = formData.get('campaign_id');
    const name = formData.get('name');
    const headline = formData.get('headline') || '';
    const body_text = formData.get('body_text') || '';
    const status = formData.get('status') || 'active';
    const { data: existing } = await sb.from('creatives').select('image_url').eq('creative_id', c.req.param('id')).single();
    if (!existing) return c.json({ error: '見つかりません' }, 404);
    let image_url = existing.image_url;
    const imageFile = formData.get('image');
    if (imageFile) {
      await deleteFromStorage(sb, image_url);
      image_url = await uploadToStorage(sb, imageFile);
    }
    const { data, error } = await sb.from('creatives')
      .update({ campaign_id: campaign_id || null, name, headline, body_text, image_url, status, updated_at: new Date().toISOString() })
      .eq('creative_id', c.req.param('id')).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (e) {
    return c.json({ error: '更新に失敗しました: ' + e.message }, 500);
  }
});

// 削除
router.delete('/:id', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const { data: existing } = await sb.from('creatives').select('image_url').eq('creative_id', c.req.param('id')).single();
    if (existing) await deleteFromStorage(sb, existing.image_url);
    await sb.from('creatives').delete().eq('creative_id', c.req.param('id'));
    return c.json({ message: '削除しました' });
  } catch (e) {
    return c.json({ error: '削除に失敗しました' }, 500);
  }
});

export default router;
