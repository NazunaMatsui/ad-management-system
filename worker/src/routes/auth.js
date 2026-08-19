import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../lib/auth.js';
import { getSupabase } from '../lib/supabase.js';

const router = new Hono();
const PRIMARY_OWNER_EMAIL = 'n-matsui@nexmesh.jp';

// 管理者専用ミドルウェア（registerより前に定義）
async function adminOnly(c, next) {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return c.json({ error: '認証が必要です' }, 401);
  try {
    const decoded = await verifyToken(token, c.env.JWT_SECRET);
    if (decoded.role !== 'owner') return c.json({ error: 'オーナー権限が必要です' }, 403);
    c.set('adminUser', decoded);
    await next();
  } catch {
    return c.json({ error: '無効なトークンです' }, 401);
  }
}

// ログイン
router.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: '入力が不正です' }, 400);

  const sb = getSupabase(c.env);
  try {
    const { data: user, error } = await sb.from('users').select('*').eq('email', email).single();
    if (error || !user) return c.json({ error: 'メールアドレスまたはパスワードが間違っています' }, 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return c.json({ error: 'メールアドレスまたはパスワードが間違っています' }, 401);

    const token = await signToken(
      { userId: user.user_id, email: user.email, role: user.role, username: user.username },
      c.env.JWT_SECRET
    );
    return c.json({ token, user: { userId: user.user_id, username: user.username, email: user.email, role: user.role, avatar: user.avatar || null } });
  } catch (e) {
    console.error('ログインエラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// ユーザー登録（オーナー権限必須）
router.post('/register', adminOnly, async (c) => {
  const adminUser = c.get('adminUser');
  const { username, email, password, role } = await c.req.json();
  if (!username || !email || !password || !['owner', 'admin'].includes(role)) {
    return c.json({ error: '入力が不正です' }, 400);
  }
  if (password.length < 6) return c.json({ error: 'パスワードは6文字以上で入力してください' }, 400);
  // ownerロールの作成はプライマリオーナーのみ
  if (role === 'owner' && adminUser.email !== PRIMARY_OWNER_EMAIL) {
    return c.json({ error: 'オーナーロールの付与はプライマリオーナーのみ可能です' }, 403);
  }

  const sb = getSupabase(c.env);
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { data, error } = await sb.from('users')
      .insert({ username, email, password_hash: passwordHash, role })
      .select('user_id, username, email, role')
      .single();
    if (error) {
      if (error.code === '23505') return c.json({ error: 'このメールアドレスまたはユーザー名は既に使用されています' }, 400);
      throw error;
    }
    return c.json({ message: 'ユーザーが作成されました', user: data }, 201);
  } catch (e) {
    console.error('ユーザー登録エラー:', e);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// 現在のユーザー情報取得
router.get('/me', async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return c.json({ error: '認証が必要です' }, 401);
  try {
    const decoded = await verifyToken(token, c.env.JWT_SECRET);
    const sb = getSupabase(c.env);
    const { data, error } = await sb.from('users').select('user_id, username, email, role, avatar').eq('user_id', decoded.userId).single();
    if (error || !data) return c.json({ error: 'ユーザーが見つかりません' }, 404);
    return c.json({ userId: data.user_id, username: data.username, email: data.email, role: data.role, avatar: data.avatar });
  } catch {
    return c.json({ error: '無効なトークンです' }, 401);
  }
});

// アバター更新
router.patch('/me/avatar', async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return c.json({ error: '認証が必要です' }, 401);
  try {
    const decoded = await verifyToken(token, c.env.JWT_SECRET);
    const { avatar } = await c.req.json();
    if (!avatar) return c.json({ error: '画像データが必要です' }, 400);
    if (avatar.length > 10 * 1024 * 1024) return c.json({ error: '画像サイズは10MB以下にしてください' }, 400);
    const sb = getSupabase(c.env);
    await sb.from('users').update({ avatar }).eq('user_id', decoded.userId);
    return c.json({ avatar });
  } catch {
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// ユーザー一覧
router.get('/users', adminOnly, async (c) => {
  const sb = getSupabase(c.env);
  const { data, error } = await sb.from('users').select('user_id, username, email, role, created_at').order('created_at', { ascending: false });
  if (error) return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  return c.json(data);
});

// ロール変更
router.patch('/users/:id/role', adminOnly, async (c) => {
  const adminUser = c.get('adminUser');
  if (adminUser.email !== PRIMARY_OWNER_EMAIL) return c.json({ error: 'この操作は許可されていません' }, 403);
  if (String(c.req.param('id')) === String(adminUser.userId)) return c.json({ error: '自分自身の権限は変更できません' }, 400);
  const { role } = await c.req.json();
  if (!['owner', 'admin'].includes(role)) return c.json({ error: '権限が不正です' }, 400);
  const sb = getSupabase(c.env);
  await sb.from('users').update({ role }).eq('user_id', c.req.param('id'));
  return c.json({ success: true });
});

// ユーザー削除
router.delete('/users/:id', adminOnly, async (c) => {
  const adminUser = c.get('adminUser');
  if (adminUser.email !== PRIMARY_OWNER_EMAIL) return c.json({ error: 'この操作は許可されていません' }, 403);
  if (String(c.req.param('id')) === String(adminUser.userId)) return c.json({ error: '自分自身は削除できません' }, 400);
  const sb = getSupabase(c.env);
  try {
    await sb.from('chat_sessions').delete().eq('user_id', c.req.param('id'));
    await sb.from('operation_memos').delete().eq('created_by', c.req.param('id'));
    await sb.from('users').delete().eq('user_id', c.req.param('id'));
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: '削除に失敗しました' }, 500);
  }
});

// メールアドレス変更
router.post('/change-email', async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return c.json({ error: '認証が必要です' }, 401);
  try {
    const decoded = await verifyToken(token, c.env.JWT_SECRET);
    const { current_password, new_email } = await c.req.json();
    if (!current_password || !new_email) return c.json({ error: '入力が不正です' }, 400);
    const sb = getSupabase(c.env);
    const { data: user } = await sb.from('users').select('*').eq('user_id', decoded.userId).single();
    if (!user) return c.json({ error: 'ユーザーが見つかりません' }, 404);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return c.json({ error: '現在のパスワードが間違っています' }, 400);
    const { error } = await sb.from('users').update({ email: new_email }).eq('user_id', decoded.userId);
    if (error?.code === '23505') return c.json({ error: 'このメールアドレスは既に使用されています' }, 400);
    const newToken = await signToken(
      { userId: user.user_id, email: new_email, role: user.role, username: user.username },
      c.env.JWT_SECRET
    );
    return c.json({ message: 'メールアドレスを変更しました', token: newToken, email: new_email });
  } catch {
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// パスワード変更
router.post('/change-password', async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return c.json({ error: '認証が必要です' }, 401);
  try {
    const decoded = await verifyToken(token, c.env.JWT_SECRET);
    const { current_password, new_password } = await c.req.json();
    if (!current_password || !new_password) return c.json({ error: '入力が不正です' }, 400);
    if (new_password.length < 6) return c.json({ error: 'パスワードは6文字以上で入力してください' }, 400);
    const sb = getSupabase(c.env);
    const { data: user } = await sb.from('users').select('*').eq('user_id', decoded.userId).single();
    if (!user) return c.json({ error: 'ユーザーが見つかりません' }, 404);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return c.json({ error: '現在のパスワードが間違っています' }, 400);
    const hash = await bcrypt.hash(new_password, 10);
    await sb.from('users').update({ password_hash: hash, temp_password: null }).eq('user_id', decoded.userId);
    return c.json({ message: 'パスワードを変更しました' });
  } catch {
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

export default router;
