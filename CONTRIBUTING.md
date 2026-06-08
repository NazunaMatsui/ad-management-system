# 貢献ガイドライン

広告費管理システムへの貢献ありがとうございます！

## 開発フロー

### 1. リポジトリのフォーク
このリポジトリをフォークしてください。

### 2. ブランチの作成
機能追加やバグ修正のために新しいブランチを作成してください。

```bash
git checkout -b feature/your-feature-name
# または
git checkout -b fix/your-bug-fix
```

### 3. コミットメッセージ
分かりやすいコミットメッセージを書いてください。

**推奨フォーマット:**
```
[カテゴリ] 簡潔な説明

詳細な説明（必要な場合）
```

**カテゴリ例:**
- `[feat]` 新機能
- `[fix]` バグ修正
- `[docs]` ドキュメント更新
- `[style]` コードフォーマット
- `[refactor]` リファクタリング
- `[test]` テスト追加
- `[chore]` その他の変更

**例:**
```bash
git commit -m "[feat] ダッシュボードに期間比較機能を追加"
git commit -m "[fix] ログイン時の認証エラーを修正"
```

### 4. プッシュとPull Request
変更をプッシュして、Pull Requestを作成してください。

```bash
git push origin feature/your-feature-name
```

## コーディング規約

### JavaScript/React
- ESLintルールに従う
- コンポーネントは関数コンポーネントを使用
- PropTypesまたはTypeScriptで型定義
- 意味のある変数名・関数名を使用

### CSS
- グローバルCSSは最小限に
- コンポーネント単位でスタイル管理
- カラー変数を使用（`var(--accent-blue)` など）

### SQL
- テーブル名は複数形（`campaigns`, `users`）
- カラム名はスネークケース（`campaign_id`, `created_at`）

## テスト
- 新機能にはテストを追加してください
- 既存のテストが通ることを確認してください

## Pull Requestのレビュー
- コードレビューは24時間以内に対応します
- 変更が大きい場合は、事前にIssueで議論してください

## 質問・相談
わからないことがあれば、Issueで質問してください！
