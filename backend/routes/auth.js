const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');

// ログイン
router.post('/login', [
  body('email').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('password').notEmpty().withMessage('パスワードを入力してください')
], async (req, res) => {
  // バリデーションチェック
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // ユーザー検索
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが間違っています' });
    }

    const user = result.rows[0];

    // パスワード確認
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが間違っています' });
    }

    // JWTトークン生成
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        email: user.email, 
        role: user.role,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// ユーザー登録（管理者のみ）
router.post('/register', [
  body('username').notEmpty().withMessage('ユーザー名を入力してください'),
  body('email').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('password').isLength({ min: 6 }).withMessage('パスワードは6文字以上で入力してください'),
  body('role').isIn(['owner', 'admin']).withMessage('権限が不正です')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role } = req.body;

  try {
    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    // ユーザー作成
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, role',
      [username, email, passwordHash, role]
    );

    res.status(201).json({
      message: 'ユーザーが作成されました',
      user: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') { // 一意制約違反
      return res.status(400).json({ error: 'このメールアドレスまたはユーザー名は既に使用されています' });
    }
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 現在のユーザー情報取得
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '認証が必要です' });
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT user_id, username, email, role, avatar FROM users WHERE user_id = $1',
      [decoded.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'ユーザーが見つかりません' });
    const u = result.rows[0];
    res.json({ userId: u.user_id, username: u.username, email: u.email, role: u.role, avatar: u.avatar });
  } catch {
    return res.status(401).json({ error: '無効なトークンです' });
  }
});

// アバター更新
router.patch('/me/avatar', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '認証が必要です' });
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: '無効なトークンです' });
  }
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ error: '画像データが必要です' });
  if (avatar.length > 10 * 1024 * 1024) return res.status(400).json({ error: '画像サイズは10MB以下にしてください' });
  try {
    await pool.query('UPDATE users SET avatar = $1 WHERE user_id = $2', [avatar, userId]);
    res.json({ avatar });
  } catch (err) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// ─── 管理者専用: ユーザー一覧 ───────────────────────────────────────────────
const PRIMARY_OWNER_EMAIL = 'n-matsui@nexmesh.jp';

const adminOnly = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '認証が必要です' });
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'owner') return res.status(403).json({ error: 'オーナー権限が必要です' });
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: '無効なトークンです' });
  }
};

router.get('/users', adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

router.patch('/users/:id/role', adminOnly, async (req, res) => {
  if (req.userEmail !== PRIMARY_OWNER_EMAIL) {
    return res.status(403).json({ error: 'この操作は許可されていません' });
  }
  if (String(req.params.id) === String(req.userId)) {
    return res.status(400).json({ error: '自分自身の権限は変更できません' });
  }
  const { role } = req.body;
  if (!['owner', 'admin'].includes(role)) {
    return res.status(400).json({ error: '権限が不正です' });
  }
  try {
    await pool.query('UPDATE users SET role = $1 WHERE user_id = $2', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '更新に失敗しました' });
  }
});

router.delete('/users/:id', adminOnly, async (req, res) => {
  if (req.userEmail !== PRIMARY_OWNER_EMAIL) {
    return res.status(403).json({ error: 'この操作は許可されていません' });
  }
  if (String(req.params.id) === String(req.userId)) {
    return res.status(400).json({ error: '自分自身は削除できません' });
  }
  try {
    await pool.query('DELETE FROM users WHERE user_id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

// メールアドレス変更
router.post('/change-email', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '認証が必要です' });
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: '無効なトークンです' });
  }

  const { current_password, new_email } = req.body;
  if (!current_password || !new_email) return res.status(400).json({ error: '入力が不正です' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: '現在のパスワードが間違っています' });

    await pool.query('UPDATE users SET email = $1 WHERE user_id = $2', [new_email, userId]);

    const newToken = jwt.sign(
      { userId: user.user_id, email: new_email, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ message: 'メールアドレスを変更しました', token: newToken, email: new_email });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'このメールアドレスは既に使用されています' });
    }
    console.error(error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// パスワード変更
router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '認証が必要です' });
  let userId;
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: '無効なトークンです' });
  }

  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: '入力が不正です' });
  if (new_password.length < 6) return res.status(400).json({ error: 'パスワードは6文字以上で入力してください' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: '現在のパスワードが間違っています' });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, userId]);
    res.json({ message: 'パスワードを変更しました' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
