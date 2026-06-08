# 📊 広告費管理システム

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.2.0-blue)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-blue)](https://www.postgresql.org/)

プロフェッショナルな広告運用を支援する、ダークテーマのWebアプリケーション

> 🚀 **Meta広告・Google広告の運用データを一元管理**  
> キャンペーンごとの詳細分析、KPI可視化、運用履歴の記録が可能

## 🎯 主な機能

### ✅ 実装済み機能
- **ダッシュボード**: リアルタイムで広告指標を可視化
- **指標管理**: 消化金額、インプレッション、クリック数、CV、CPA、CPC、CTR、CVR
- **期間指定**: 任意の期間でデータを集計・表示
- **キャンペーン管理**: 複数キャンペーンの個別管理とグループ合算
- **運用メモ**: 日次の施策記録機能
- **ユーザー認証**: JWT認証による安全なアクセス管理

### 🔜 今後実装予定
- **Meta広告API連携**: 自動データ取得（毎朝9時）
- **予約システムAPI連携**: CV数の自動取得
- **期間比較機能**: 前週比・前月比の詳細分析
- **アラート機能**: KPI目標達成/未達のアラート通知

---

## 🏗️ 技術スタック

### バックエンド
- **言語**: Node.js
- **フレームワーク**: Express
- **データベース**: PostgreSQL
- **認証**: JWT (jsonwebtoken)
- **自動実行**: node-cron

### フロントエンド
- **ライブラリ**: React 18
- **ビルドツール**: Vite
- **ルーティング**: React Router v6
- **グラフ**: Recharts
- **アイコン**: Lucide React
- **日付処理**: date-fns

### デプロイ推奨環境
- **フロントエンド**: Vercel
- **バックエンド**: Vercel / Heroku / Railway
- **データベース**: Supabase (PostgreSQL)

---

## 🚀 セットアップ手順

### 1. リポジトリのクローン

\`\`\`bash
cd ad-management-system
\`\`\`

### 2. データベースのセットアップ

#### Supabaseを使用する場合（推奨）

1. [Supabase](https://supabase.com) でアカウント作成
2. 新しいプロジェクトを作成
3. SQL Editorで `database/schema.sql` を実行
4. データベース接続URLを取得（Settings → Database → Connection string）

### 3. バックエンドのセットアップ

\`\`\`bash
cd backend

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集してデータベースURLとJWT_SECRETを設定

# パスワードハッシュの生成（初回のみ）
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));"
# 出力されたハッシュをデータベースのusersテーブルに手動で設定

# サーバー起動
npm run dev
\`\`\`

バックエンドは `http://localhost:5000` で起動します。

### 4. フロントエンドのセットアップ

\`\`\`bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
\`\`\`

フロントエンドは `http://localhost:3000` で起動します。

### 5. 初回ログイン

デフォルトの管理者アカウント:
- **Email**: `admin@example.com`
- **Password**: `admin123`

⚠️ **セキュリティ上、本番環境では必ずパスワードを変更してください！**

---

## 📁 プロジェクト構成

\`\`\`
ad-management-system/
├── backend/                  # バックエンド
│   ├── config/              # 設定ファイル
│   │   └── database.js      # DB接続設定
│   ├── middleware/          # ミドルウェア
│   │   └── auth.js          # JWT認証
│   ├── routes/              # APIルート
│   │   ├── auth.js          # 認証API
│   │   ├── campaigns.js     # キャンペーンAPI
│   │   ├── metrics.js       # 指標API
│   │   └── memos.js         # メモAPI
│   ├── .env.example         # 環境変数テンプレート
│   ├── package.json         # 依存関係
│   └── server.js            # メインサーバー
│
├── frontend/                # フロントエンド
│   ├── src/
│   │   ├── components/      # コンポーネント
│   │   │   └── Layout.jsx   # レイアウト
│   │   ├── context/         # Context API
│   │   │   └── AuthContext.jsx
│   │   ├── pages/           # ページ
│   │   │   ├── Login.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── styles/          # スタイル
│   │   │   └── globals.css
│   │   ├── utils/           # ユーティリティ
│   │   │   └── api.js       # API クライアント
│   │   ├── App.jsx          # ルーティング
│   │   └── main.jsx         # エントリーポイント
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── database/                # データベース
│   └── schema.sql           # スキーマ定義
│
└── README.md                # このファイル
\`\`\`

---

## 🔧 API エンドポイント

### 認証
- `POST /api/auth/login` - ログイン
- `POST /api/auth/register` - ユーザー登録（管理者のみ）

### キャンペーン
- `GET /api/campaigns` - キャンペーン一覧取得
- `GET /api/campaigns/:id` - キャンペーン詳細取得
- `POST /api/campaigns` - キャンペーン作成
- `PUT /api/campaigns/:id` - キャンペーン更新
- `DELETE /api/campaigns/:id` - キャンペーン削除

### 指標
- `GET /api/metrics` - 日次指標取得
- `GET /api/metrics/summary` - 集計データ取得
- `GET /api/metrics/compare` - 期間比較データ取得
- `POST /api/metrics` - 指標登録・更新
- `DELETE /api/metrics/:id` - 指標削除

### 運用メモ
- `GET /api/memos` - メモ一覧取得
- `GET /api/memos/:id` - メモ詳細取得
- `POST /api/memos` - メモ作成
- `PUT /api/memos/:id` - メモ更新
- `DELETE /api/memos/:id` - メモ削除

---

## 🌐 デプロイ手順

### Supabase + Vercel構成（推奨）

#### 1. Supabaseでデータベース作成
1. [Supabase](https://supabase.com) でプロジェクト作成
2. `database/schema.sql` を実行
3. 接続URLをメモ

#### 2. Vercelでバックエンドデプロイ
1. [Vercel](https://vercel.com) でアカウント作成
2. `backend` フォルダをデプロイ
3. 環境変数を設定:
   - `DATABASE_URL`: Supabaseの接続URL
   - `JWT_SECRET`: ランダムな秘密鍵
   - `NODE_ENV`: `production`

#### 3. Vercelでフロントエンドデプロイ
1. `frontend` フォルダをデプロイ
2. 環境変数を設定:
   - `VITE_API_URL`: バックエンドのURL

#### 4. 動作確認
- フロントエンドURLにアクセス
- ログインして動作確認

---

## 🔐 セキュリティ

### 推奨事項
1. **JWT_SECRETを変更**: `.env` の `JWT_SECRET` を強力なランダム文字列に変更
2. **デフォルトパスワード変更**: 初回ログイン後、必ずパスワードを変更
3. **HTTPS使用**: 本番環境では必ずHTTPSを使用
4. **環境変数の保護**: `.env` ファイルは絶対にGitにコミットしない

---

## 📊 データベーススキーマ

### users（ユーザー）
- user_id (主キー)
- username
- email
- password_hash
- role (admin/viewer)

### campaigns（キャンペーン）
- campaign_id (主キー)
- campaign_name
- meta_campaign_id
- is_group
- parent_campaign_id

### daily_metrics（日次指標）
- id (主キー)
- campaign_id (外部キー)
- date
- spend（消化金額）
- impressions（インプレッション）
- clicks（クリック数）
- conversions_meta（MetaのCV）
- conversions_booking（予約システムのCV）
- cpa, cpc, ctr, cvr（自動計算）

### operation_memos（運用メモ）
- id (主キー)
- campaign_id (外部キー)
- date
- memo_content
- created_by（作成者）

---

## 🛠️ トラブルシューティング

### データベース接続エラー
- Supabaseの接続URLが正しいか確認
- `.env` ファイルの `DATABASE_URL` を確認
- Supabaseのプロジェクトが一時停止していないか確認

### ログインできない
- データベースに初期ユーザーが登録されているか確認
- パスワードハッシュが正しく設定されているか確認
- ブラウザのコンソールでエラーを確認

### APIが呼べない
- バックエンドサーバーが起動しているか確認
- CORS設定を確認
- ネットワークタブでリクエストを確認

---

## 📞 サポート

質問や問題がある場合は、プロジェクト管理者に連絡してください。

---

## 📄 ライセンス

MIT License

---

## 🎉 次のステップ

1. Meta広告APIの連携設定
2. 予約システムAPIの連携設定
3. 毎朝9時の自動実行設定
4. 期間比較機能の実装
5. アラート機能の追加

これで基本的な広告費管理システムが完成しました！🚀
