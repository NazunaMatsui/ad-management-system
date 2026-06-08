const { Pool } = require('pg');
require('dotenv').config();

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
