# Git コマンドメモ

## 🔧 基本的なGitコマンド

### 変更状況確認
```bash
git status
```

### 変更をステージング
```bash
# 全ての変更をステージング
git add .

# 特定ファイルのみ
git add src/app/instagram/posts/page.tsx
```

### コミット
```bash
git commit -m "コミットメッセージ"
```

### リモートにプッシュ
```bash
git push origin main
```

## 🚀 まとめて実行

### ワンライナー
```bash
git add . && git commit -m "メッセージ" && git push origin main
```

### 段階的実行
```bash
# 1. ステージング
git add .

# 2. コミット
git commit -m "Fix type errors and improve Instagram posts UI"

# 3. プッシュ
git push origin main
```

## 📋 よく使うコミットメッセージ

### バグ修正
```bash
git commit -m "Fix: バグの説明"
```

### 機能追加
```bash
git commit -m "Add: 機能の説明"
```

### UI改善
```bash
git commit -m "Improve: UIの改善内容"
```

### 型エラー修正
```bash
git commit -m "Fix: TypeScript type errors"
```

## 🔍 トラブルシューティング

### リモートリポジトリ確認
```bash
git remote -v
```

### リモート追加
```bash
git remote add origin https://github.com/username/repo.git
```

### ブランチ確認
```bash
git branch -a
```

## 📝 今回の変更履歴

### 2025-10-02
- **型エラー修正**: `postAnalytics`の型一貫性確保
- **UI改善**: Instagram投稿一覧のカードレイアウト
- **機能追加**: 月次レポートの分析データ表示
- **バグ修正**: `Date`コンストラクタの安全な呼び出し

### 変更されたファイル
- `src/app/api/posts/route.ts`
- `src/app/instagram/analytics/page.tsx`
- `src/app/instagram/components/AnalyticsForm.tsx`
- `src/app/instagram/lab/components/PostEditor.tsx`
- `src/app/instagram/monthly-report/page.tsx`
- `src/app/instagram/posts/page.tsx`
- `src/hooks/useSNSSettings.ts`

## 🚀 Vercelデプロイ

### 自動デプロイ
- `git push origin main` で自動的にVercelデプロイが開始
- 数分で本番環境に反映

### 手動デプロイ
```bash
# Vercel CLIがインストールされていない場合
npm i -g vercel

# デプロイ実行
vercel --prod
```

## 💡 注意点

- コミット前に `git status` で変更内容を確認
- コミットメッセージは分かりやすく記述
- プッシュ前にリモートリポジトリの設定を確認
- デプロイ完了まで数分待機
