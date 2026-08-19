import { Hono } from 'hono';
import { authMiddleware } from '../lib/auth.js';
import { getSupabase } from '../lib/supabase.js';

const router = new Hono();
router.use('*', authMiddleware());

const BUCKET = 'creative-images';

async function uploadToStorage(sb, file) {
  const ext = file.name.split('.').pop();
  const filename = `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
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

// ─── 画像/動画 ────────────────────────────────────────────

router.get('/images', async (c) => {
  const { search, store } = c.req.query();
  const sb = getSupabase(c.env);
  try {
    let query = sb.from('creative_images').select('*').order('created_at', { ascending: false });
    if (search) query = query.or(`name.ilike.%${search}%,tags.ilike.%${search}%,memo.ilike.%${search}%`);
    if (store && store !== 'all') query = query.eq('store', store);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data || []);
  } catch (e) {
    return c.json({ error: 'データ取得に失敗しました' }, 500);
  }
});

router.post('/images', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const formData = await c.req.formData();
    const name = formData.get('name');
    if (!name) return c.json({ error: '名前は必須です' }, 400);
    const f1 = formData.get('media1');
    if (!f1) return c.json({ error: '1枚目の画像/動画は必須です' }, 400);
    const f2 = formData.get('media2');
    const f3 = formData.get('media3');
    const media_type = f1.type?.startsWith('video/') ? 'video' : 'image';
    const url1 = await uploadToStorage(sb, f1);
    const url2 = f2 ? await uploadToStorage(sb, f2) : null;
    const url3 = f3 ? await uploadToStorage(sb, f3) : null;
    const { data, error } = await sb.from('creative_images').insert({
      name,
      image_url: url1, image_url_2: url2, image_url_3: url3,
      size_label_1: formData.get('size_label_1') || 'スクエア(1:1)',
      size_label_2: formData.get('size_label_2') || 'ストーリー(9:16)',
      size_label_3: formData.get('size_label_3') || '横型(16:9)',
      media_type,
      memo: formData.get('memo') || null,
      tags: formData.get('tags') || null,
      store: formData.get('store') || null,
    }).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (e) {
    console.error(e);
    return c.json({ error: '登録に失敗しました: ' + e.message }, 500);
  }
});

router.put('/images/:id', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const { data: row } = await sb.from('creative_images').select('*').eq('id', c.req.param('id')).single();
    if (!row) return c.json({ error: '見つかりません' }, 404);
    const formData = await c.req.formData();
    const f1 = formData.get('media1');
    const f2 = formData.get('media2');
    const f3 = formData.get('media3');
    let url1 = row.image_url, url2 = row.image_url_2, url3 = row.image_url_3;
    let media_type = row.media_type;
    if (f1) { await deleteFromStorage(sb, row.image_url); url1 = await uploadToStorage(sb, f1); media_type = f1.type?.startsWith('video/') ? 'video' : 'image'; }
    if (f2) { await deleteFromStorage(sb, row.image_url_2); url2 = await uploadToStorage(sb, f2); }
    if (f3) { await deleteFromStorage(sb, row.image_url_3); url3 = await uploadToStorage(sb, f3); }
    if (formData.get('clear2') === '1') { await deleteFromStorage(sb, url2); url2 = null; }
    if (formData.get('clear3') === '1') { await deleteFromStorage(sb, url3); url3 = null; }
    const { data, error } = await sb.from('creative_images').update({
      name: formData.get('name'),
      memo: formData.get('memo') || null,
      tags: formData.get('tags') || null,
      store: formData.get('store') || null,
      image_url: url1, image_url_2: url2, image_url_3: url3,
      size_label_1: formData.get('size_label_1') || row.size_label_1,
      size_label_2: formData.get('size_label_2') || row.size_label_2,
      size_label_3: formData.get('size_label_3') || row.size_label_3,
      media_type, updated_at: new Date().toISOString(),
    }).eq('id', c.req.param('id')).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (e) {
    return c.json({ error: '更新に失敗しました: ' + e.message }, 500);
  }
});

router.delete('/images/:id', async (c) => {
  const sb = getSupabase(c.env);
  try {
    const { data: row } = await sb.from('creative_images').select('*').eq('id', c.req.param('id')).single();
    if (row) {
      await deleteFromStorage(sb, row.image_url);
      await deleteFromStorage(sb, row.image_url_2);
      await deleteFromStorage(sb, row.image_url_3);
    }
    await sb.from('creative_images').delete().eq('id', c.req.param('id'));
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: '削除に失敗しました' }, 500);
  }
});

// ─── 広告文 ──────────────────────────────────────────────

router.get('/texts', async (c) => {
  const { search, store } = c.req.query();
  const sb = getSupabase(c.env);
  try {
    let query = sb.from('creative_texts').select('*').order('created_at', { ascending: false });
    if (search) query = query.or(`name.ilike.%${search}%,headline.ilike.%${search}%,body_text.ilike.%${search}%,tags.ilike.%${search}%`);
    if (store && store !== 'all') query = query.eq('store', store);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data || []);
  } catch (e) {
    return c.json({ error: 'データ取得に失敗しました' }, 500);
  }
});

router.post('/texts', async (c) => {
  const body = await c.req.json();
  if (!body.name) return c.json({ error: '名前は必須です' }, 400);
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('creative_texts').insert({
      name: body.name, headline: body.headline || null, headline_2: body.headline_2 || null,
      headline_3: body.headline_3 || null, headline_4: body.headline_4 || null, headline_5: body.headline_5 || null,
      body_text: body.body_text || null, memo: body.memo || null, tags: body.tags || null, store: body.store || null,
    }).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (e) {
    return c.json({ error: '登録に失敗しました' }, 500);
  }
});

router.put('/texts/:id', async (c) => {
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  try {
    const { data, error } = await sb.from('creative_texts').update({
      name: body.name, headline: body.headline || null, headline_2: body.headline_2 || null,
      headline_3: body.headline_3 || null, headline_4: body.headline_4 || null, headline_5: body.headline_5 || null,
      body_text: body.body_text || null, memo: body.memo || null, tags: body.tags || null, store: body.store || null,
      updated_at: new Date().toISOString(),
    }).eq('id', c.req.param('id')).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (e) {
    return c.json({ error: '更新に失敗しました' }, 500);
  }
});

router.delete('/texts/:id', async (c) => {
  const sb = getSupabase(c.env);
  try {
    await sb.from('creative_texts').delete().eq('id', c.req.param('id'));
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: '削除に失敗しました' }, 500);
  }
});

export default router;
