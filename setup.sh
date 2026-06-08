#!/bin/bash

echo "========================================="
echo "  📊 広告費管理システム セットアップ"
echo "========================================="
echo ""

# カラー設定
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# バックエンドのセットアップ
echo -e "${BLUE}[1/3] バックエンドのセットアップ...${NC}"
cd backend
npm install
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}⚠️  .env ファイルを作成しました。必要な情報を入力してください${NC}"
fi
cd ..
echo -e "${GREEN}✅ バックエンドのセットアップ完了${NC}"
echo ""

# フロントエンドのセットアップ
echo -e "${BLUE}[2/3] フロントエンドのセットアップ...${NC}"
cd frontend
npm install
cd ..
echo -e "${GREEN}✅ フロントエンドのセットアップ完了${NC}"
echo ""

# データベーススキーマの案内
echo -e "${BLUE}[3/3] データベースの設定...${NC}"
echo -e "${YELLOW}⚠️  次の手順でデータベースをセットアップしてください:${NC}"
echo "1. Supabase (https://supabase.com) でアカウント作成"
echo "2. 新しいプロジェクトを作成"
echo "3. SQL Editor で database/schema.sql を実行"
echo "4. 接続URLを backend/.env の DATABASE_URL に設定"
echo ""

# パスワードハッシュ生成の案内
echo -e "${BLUE}初期パスワードのハッシュ生成:${NC}"
echo "以下のコマンドを実行してパスワードハッシュを生成してください:"
echo -e "${YELLOW}cd backend && node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));\"${NC}"
echo ""

echo -e "${GREEN}========================================="
echo "  ✅ セットアップ完了!"
echo "=========================================${NC}"
echo ""
echo "次のステップ:"
echo "1. backend/.env を編集してデータベースURLとJWT_SECRETを設定"
echo "2. データベーススキーマを実行（上記参照）"
echo "3. バックエンド起動: cd backend && npm run dev"
echo "4. フロントエンド起動: cd frontend && npm run dev"
echo ""
echo "ログイン情報:"
echo "Email: admin@example.com"
echo "Password: admin123"
echo ""
