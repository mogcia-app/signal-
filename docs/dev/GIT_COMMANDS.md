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

## ⚠️ よくあるエラーと対処法

### 1. リモートが既に存在するエラー

```bash
# エラー: remote origin already exists
git remote remove origin
git remote add origin https://github.com/username/repo.git
```

### 2. リモートが存在しないエラー

```bash
# エラー: No such remote: 'origin'
git remote add origin https://github.com/username/repo.git
```

### 3. 何もコミットするものがないエラー

```bash
# エラー: nothing to commit, working tree clean
# 解決法1: 小さな変更を加える
echo "# 更新" >> README.md
git add . && git commit -m "update: 軽微な更新" && git push origin main

# 解決法2: 空のコミットを作成
git commit --allow-empty -m "trigger: デプロイをトリガー"
git push origin main
```

### 4. 権限エラー

```bash
# エラー: Read-only file system
sudo git init
sudo git remote add origin https://github.com/username/repo.git
```

### 5. 認証エラー

```bash
# ユーザー情報を設定
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# GitHubの認証（Personal Access Tokenが必要な場合）
git remote set-url origin https://username:token@github.com/username/repo.git
```

### 6. ブランチの競合エラー

```bash
# 強制プッシュ（注意：既存のコードが上書きされます）
git push -u origin main --force

# または、新しいブランチを作成
git checkout -b new-branch
git push -u origin new-branch
```

### 7. マージコンフリクト

```bash
# コンフリクトを確認
git status

# コンフリクトを解決後
git add .
git commit -m "resolve: マージコンフリクトを解決"
git push origin main
```

### 8. Vercelデプロイが走らない場合

```bash
# 方法1: 小さな変更を加えてプッシュ
echo "# デプロイトリガー" >> README.md
git add . && git commit -m "trigger: Vercelデプロイ" && git push origin main

# 方法2: Vercel CLIで直接デプロイ
npx vercel --prod --yes

# 方法3: 空のコミットでトリガー
git commit --allow-empty -m "trigger: Vercelデプロイをトリガー"
git push origin main
```

## 📝 今回の変更履歴

### 2025-10-04

- **BFF化実装**: 月次レポートの計算処理をバックエンドに移行
- **API追加**: `/api/analytics/monthly-report-summary`エンドポイント
- **パフォーマンス向上**: フロントエンドの計算処理を大幅に簡素化
- **型安全性**: TypeScriptでAPIレスポンスの型を定義
- **コンポーネント分割**: 月次レポートページを9つのコンポーネントに分割

### 変更されたファイル

- `src/app/api/analytics/monthly-report-summary/route.ts` (新規)
- `src/app/instagram/monthly-report/page.tsx`
- `src/app/instagram/monthly-report/components/ReportHeader.tsx` (新規)
- `src/app/instagram/monthly-report/components/PerformanceRating.tsx` (新規)
- `src/app/instagram/monthly-report/components/MetricsCards.tsx` (新規)
- `src/app/instagram/monthly-report/components/DetailedStats.tsx` (新規)
- `src/app/instagram/monthly-report/components/VisualizationSection.tsx` (新規)
- `src/app/instagram/monthly-report/components/AudienceAnalysis.tsx` (新規)
- `src/app/instagram/monthly-report/components/AdvancedAnalysis.tsx` (新規)
- `src/app/instagram/monthly-report/components/AIPredictionAnalysis.tsx` (新規)
- `src/app/instagram/monthly-report/components/DataExport.tsx` (新規)

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
