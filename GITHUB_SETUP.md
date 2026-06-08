# 🚀 GitHub リポジトリセットアップガイド

このプロジェクトをGitHubで管理する手順

---

## 📋 前提条件

- GitHubアカウントを持っている
- Gitがインストールされている

---

## 🔧 セットアップ手順

### 1. GitHubで新しいリポジトリを作成

1. https://github.com/new にアクセス
2. 以下を設定:
   - **Repository name**: `ad-management-system`（または任意の名前）
   - **Description**: `広告費管理システム - プロフェッショナルなダークテーマのWebアプリ`
   - **Visibility**: Private（推奨）または Public
   - **✅ チェックを入れない**: "Add a README file", ".gitignore", "license" （既に作成済み）
3. "Create repository" をクリック

---

### 2. ローカルでGitを初期化

プロジェクトのルートディレクトリで以下を実行:

```bash
cd ad-management-system

# Gitリポジトリを初期化
git init

# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "[init] 広告費管理システムの初期構築完了

- データベーススキーマ（PostgreSQL）
- バックエンドAPI（Node.js + Express）
- フロントエンド（React + Vite）
- JWT認証
- ダッシュボード機能
- デプロイ設定（Vercel対応）"
```

---

### 3. GitHubリポジトリにプッシュ

GitHubで作成したリポジトリのURLを使用:

```bash
# リモートリポジトリを追加（URLは自分のリポジトリに置き換え）
git remote add origin https://github.com/YOUR_USERNAME/ad-management-system.git

# メインブランチの名前を確認・変更
git branch -M main

# プッシュ
git push -u origin main
```

**⚠️ 重要:** `YOUR_USERNAME` を自分のGitHubユーザー名に置き換えてください！

---

### 4. .env ファイルの保護確認

`.gitignore` に `.env` が含まれているか確認:

```bash
cat .gitignore | grep ".env"
```

✅ `.env` が表示されればOK（機密情報がGitHubにアップロードされません）

---

## 🔐 機密情報の管理

### GitHub Secretsに環境変数を設定

本番環境のデプロイ時は、GitHub Secretsを使用します。

1. GitHubリポジトリページで「Settings」→「Secrets and variables」→「Actions」
2. 「New repository secret」をクリック
3. 以下を追加:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Supabaseの接続URL |
| `JWT_SECRET` | JWT秘密鍵 |
| `META_ACCESS_TOKEN` | Meta広告APIトークン（後で） |
| `BOOKING_API_KEY` | 予約システムAPIキー（後で） |

---

## 📦 ブランチ戦略

### 推奨ブランチ構成

```
main (本番環境)
  └── develop (開発環境)
       ├── feature/meta-api-integration
       ├── feature/booking-api-integration
       ├── feature/period-comparison
       └── fix/dashboard-performance
```

### ブランチの作成例

```bash
# 新機能開発
git checkout -b feature/meta-api-integration

# バグ修正
git checkout -b fix/login-error

# 作業後、developにマージ
git checkout develop
git merge feature/meta-api-integration

# developをmainにマージ（リリース時）
git checkout main
git merge develop
```

---

## 🚀 Vercelとの連携（自動デプロイ）

### フロントエンドのデプロイ

1. [Vercel](https://vercel.com) にログイン
2. 「New Project」をクリック
3. GitHubリポジトリを選択
4. 以下を設定:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 環境変数を設定:
   - `VITE_API_URL`: バックエンドのURL
6. 「Deploy」をクリック

### バックエンドのデプロイ

1. Vercelで新しいプロジェクトを作成
2. 同じGitHubリポジトリを選択
3. 以下を設定:
   - **Root Directory**: `backend`
   - **Build Command**: (空欄)
   - **Output Directory**: (空欄)
4. 環境変数を設定:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NODE_ENV`: `production`
5. 「Deploy」をクリック

---

## 🔄 日常の開発フロー

### 1. 最新コードを取得

```bash
git pull origin main
```

### 2. 新しいブランチで作業

```bash
git checkout -b feature/new-feature
# 開発...
git add .
git commit -m "[feat] 新機能を追加"
git push origin feature/new-feature
```

### 3. Pull Requestを作成

GitHubのリポジトリページで「Pull requests」→「New pull request」

---

## 📊 GitHub Actionsで自動テスト（オプション）

`.github/workflows/test.yml` を作成:

```yaml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install backend dependencies
      working-directory: ./backend
      run: npm ci
    
    - name: Install frontend dependencies
      working-directory: ./frontend
      run: npm ci
    
    - name: Run tests
      working-directory: ./backend
      run: npm test
```

---

## 🎯 リポジトリの整理

### README.mdにバッジを追加

```markdown
# 📊 広告費管理システム

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.2.0-blue)](https://reactjs.org/)
```

### トピックを追加

GitHubリポジトリページで「About」→「Settings」→「Topics」:
- `advertising`
- `marketing`
- `analytics`
- `dashboard`
- `react`
- `nodejs`
- `postgresql`

---

## 📞 トラブルシューティング

### GitHubにプッシュできない

```bash
# 認証情報を確認
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# SSH接続の場合
ssh -T git@github.com

# HTTPS接続の場合（Personal Access Token使用）
# Settings → Developer settings → Personal access tokens → Generate new token
```

### .env ファイルがコミットされてしまった

```bash
# 履歴から削除
git rm --cached backend/.env
git commit -m "[fix] .envファイルを履歴から削除"
git push origin main

# GitHubのSecretを変更（漏洩した情報は必ず変更！）
```

---

## ✅ セットアップ完了チェックリスト

- [ ] GitHubリポジトリを作成
- [ ] ローカルでGitを初期化
- [ ] 初回コミット完了
- [ ] GitHubにプッシュ完了
- [ ] .gitignoreが機能している（.envが除外されている）
- [ ] GitHub Secretsに機密情報を設定
- [ ] README.mdが正しく表示される
- [ ] Vercel連携（オプション）

---

**これでGitHubでの管理準備が完了です！🎉**

チーム開発や個人のバージョン管理が簡単になります！
