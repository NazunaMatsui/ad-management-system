import { SignJWT, jwtVerify } from 'jose';

export async function signToken(payload, secret) {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifyToken(token, secret) {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload;
}

// Hono ミドルウェア: JWT 認証
export function authMiddleware() {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return c.json({ error: '認証トークンがありません' }, 401);
    try {
      const user = await verifyToken(token, c.env.JWT_SECRET);
      c.set('user', user);
      await next();
    } catch {
      return c.json({ error: 'トークンが無効です' }, 403);
    }
  };
}
