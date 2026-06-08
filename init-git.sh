#!/bin/bash

# カラー設定
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  🚀 Git & GitHub セットアップ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Gitの確認
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Gitがインストールされていません${NC}"
    echo "Gitをインストールしてから再実行してください"
    exit 1
fi

echo -e "${GREEN}✅ Git is installed${NC}"
echo ""

# Git設定の確認
echo -e "${BLUE}[1/5] Git設定の確認...${NC}"
GIT_USER_NAME=$(git config --global user.name)
GIT_USER_EMAIL=$(git config --global user.email)

if [ -z "$GIT_USER_NAME" ] || [ -z "$GIT_USER_EMAIL" ]; then
    echo -e "${YELLOW}⚠️  Git設定が未完了です${NC}"
    echo ""
    read -p "あなたの名前を入力してください: " USER_NAME
    read -p "あなたのメールアドレスを入力してください: " USER_EMAIL
    
    git config --global user.name "$USER_NAME"
    git config --global user.email "$USER_EMAIL"
    
    echo -e "${GREEN}✅ Git設定完了${NC}"
else
    echo -e "${GREEN}✅ Git設定済み${NC}"
    echo "   Name: $GIT_USER_NAME"
    echo "   Email: $GIT_USER_EMAIL"
fi
echo ""

# Gitリポジトリの初期化
echo -e "${BLUE}[2/5] Gitリポジトリの初期化...${NC}"
if [ -d ".git" ]; then
    echo -e "${YELLOW}⚠️  既にGitリポジトリが初期化されています${NC}"
else
    git init
    echo -e "${GREEN}✅ Gitリポジトリを初期化しました${NC}"
fi
echo ""

# .gitignoreの確認
echo -e "${BLUE}[3/5] .gitignoreの確認...${NC}"
if grep -q "\.env" .gitignore; then
    echo -e "${GREEN}✅ .env ファイルが保護されています${NC}"
else
    echo -e "${RED}❌ .env が .gitignore に含まれていません！${NC}"
fi
echo ""

# ファイルのステージング
echo -e "${BLUE}[4/5] ファイルをステージング...${NC}"
git add .
echo -e "${GREEN}✅ すべてのファイルをステージングしました${NC}"
echo ""

# 初回コミット
echo -e "${BLUE}[5/5] 初回コミット...${NC}"
if git rev-parse HEAD >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  既にコミットが存在します${NC}"
else
    git commit -m "[init] 広告費管理システムの初期構築完了

- データベーススキーマ（PostgreSQL/Supabase）
- バックエンドAPI（Node.js + Express + JWT認証）
- フロントエンド（React + Vite + ダークテーマ）
- ダッシュボード機能（サマリー、KPI、グラフ）
- キャンペーン管理・期間指定機能
- 運用メモ機能
- デプロイ設定（Vercel対応）
- CI/CD設定（GitHub Actions）"
    
    echo -e "${GREEN}✅ 初回コミット完了${NC}"
fi
echo ""

# GitHubリモートリポジトリの設定案内
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}  ✅ Git初期化完了！${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${YELLOW}📝 次のステップ:${NC}"
echo ""
echo "1. GitHubで新しいリポジトリを作成してください:"
echo -e "   ${BLUE}https://github.com/new${NC}"
echo ""
echo "2. 以下のコマンドでリモートリポジトリを追加:"
echo -e "   ${BLUE}git remote add origin https://github.com/YOUR_USERNAME/ad-management-system.git${NC}"
echo -e "   ${YELLOW}（YOUR_USERNAMEを自分のユーザー名に変更）${NC}"
echo ""
echo "3. メインブランチを設定:"
echo -e "   ${BLUE}git branch -M main${NC}"
echo ""
echo "4. GitHubにプッシュ:"
echo -e "   ${BLUE}git push -u origin main${NC}"
echo ""
echo -e "${GREEN}詳細は GITHUB_SETUP.md を参照してください！${NC}"
echo ""
