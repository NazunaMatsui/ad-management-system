const { Pool, types } = require('pg');
require('dotenv').config();

// DATE型をJavaScript Dateに変換せず文字列"YYYY-MM-DD"のまま返す
// デフォルトのJST変換により日付が1日ずれる問題を防ぐ
types.setTypeParser(1082, val => val);

// PostgreSQL接続プール
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 接続テスト
pool.on('connect', () => {
  console.log('✅ データベース接続成功');
});

pool.on('error', (err) => {
  console.error('❌ データベース接続エラー:', err);
});

module.exports = pool;
