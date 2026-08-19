const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./ad-management.db');
const bcrypt = require('bcryptjs');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  const hash = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password_hash, role) 
          VALUES ('admin', 'admin@example.com', ?, 'admin')`, [hash]);
  
  console.log('✅ データベース初期化完了!');
  db.close();
});
