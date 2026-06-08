# 🚀 クイックスタートガイド

最速で広告費管理システムを起動する手順

---

## ⚡ 5分でスタート

### 1. セットアップスクリプトを実行

```bash
./setup.sh
```

これで依存関係のインストールが完了します。

---

### 2. Supabaseでデータベース作成

#### 2-1. Supabaseアカウント作成
https://supabase.com にアクセスして無料アカウントを作成

#### 2-2. 新しいプロジェクトを作成
- プロジェクト名: `ad-management` (任意)
- データベースパスワード: 強力なパスワードを設定（メモしておく）
- リージョン: `Northeast Asia (Tokyo)` を推奨

#### 2-3. スキーマを実行
1. 左メニューの「SQL Editor」をクリック
2. `database/schema.sql` の内容をコピー&ペースト
3. 「Run」ボタンをクリック

✅ テーブルが作成され、サンプルデータが入ります

#### 2-4. 接続URLを取得
1. 左メニューの「Settings」→「Database」
2. 「Connection string」→「URI」をコピー
3. パスワード部分（`[YOUR-PASSWORD]`）を実際のパスワードに置き換え

---

### 3. バックエンドの設定

```bash
cd backend
```

#### 3-1. .env ファイルを編集

```bash
nano .env  # または任意のエディタ
```

以下を設定:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
JWT_SECRET=your_super_secret_random_key_here_min_32_chars
PORT=5000
NODE_ENV=development
```

**重要:** `JWT_SECRET` は以下のコマンドで生成できます:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3-2. パスワードハッシュを生成して設定

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));"
```

出力されたハッシュをコピーして、Supabaseの「Table Editor」で以下を実行:
1. `users` テーブルを開く
2. `admin@example.com` のレコードを探す
3. `password_hash` カラムを生成したハッシュに更新

---

### 4. サーバー起動

#### ターミナル1: バックエンド起動

```bash
cd backend
npm run dev
```

✅ `🚀 サーバーがポート5000で起動しました` が表示されればOK

#### ターミナル2: フロントエンド起動

```bash
cd frontend
npm run dev
```

✅ `http://localhost:3000` にアクセス可能になります

---

### 5. ログイン

ブラウザで http://localhost:3000 を開く

**デフォルトログイン情報:**
- Email: `admin@example.com`
- Password: `admin123`

---

## 🎉 完了！

ダッシュボードが表示されれば成功です！

---

## 📊 次にやること

### サンプルデータの確認
- ダッシュボードにサンプルデータが表示されます
- キャンペーン選択、期間指定を試してみてください

### ユーザー追加（オプション）
API経由で追加ユーザーを作成できます:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "username": "marketer1",
    "email": "marketer1@example.com",
    "password": "password123",
    "role": "viewer"
  }'
```

---

## 🔧 トラブルシューティング

### データベース接続エラー
- Supabaseの接続URLが正しいか確認
- パスワードに特殊文字がある場合はURLエンコード
- Supabaseプロジェクトが一時停止していないか確認

### ログインできない
- パスワードハッシュが正しく設定されているか確認
- ブラウザのコンソール（F12）でエラーを確認

### ポートが使用中
バックエンドまたはフロントエンドのポートが使用中の場合:

```bash
# バックエンド（デフォルト5000）
PORT=5001 npm run dev

# フロントエンド（デフォルト3000）
# vite.config.js のポート番号を変更
```

---

## 📚 詳細ドキュメント

詳細な情報は `README.md` を参照してください。

---

**Happy Advertising! 🎯**
