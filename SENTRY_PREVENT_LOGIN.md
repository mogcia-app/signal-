# Sentry Prevent へのアクセス方法 🔐

## エラー状況

「データの読み込み中にエラーが発生しました」またはログインページが表示される

## 原因

Sentryにログインしていないため、ダッシュボードにアクセスできません。

## 解決方法

### 1. Sentryにログイン

#### 方法A: Google アカウントでログイン ✅ 推奨

1. https://mogcia.sentry.io/ にアクセス
2. **Sign in with Google** をクリック
3. Google アカウントでサインイン

#### 方法B: GitHub アカウントでログイン

1. https://mogcia.sentry.io/ にアクセス
2. **Sign in with GitHub** をクリック
3. GitHub アカウントでサインイン

#### 方法C: Email/Passwordでログイン

1. https://mogcia.sentry.io/ にアクセス
2. 登録したEmail/Passwordでログイン

### 2. ログイン後、Sentry Preventにアクセス

以下のURLにアクセス：
**https://mogcia.sentry.io/prevent/signal/**

### 3. テスト結果を確認

- ダッシュボードが表示される
- テスト分析データが表示される
- カバレッジ情報が表示される

## 現在の状態確認

### GitHub Actionsの結果は確認できます ✅

GitHub Actionsでは、以下のURLでテスト結果を確認できます：
**https://github.com/mogcia-app/signal-/actions**

最新のワークフローをクリックして：

- テストの実行結果
- 成功/失敗のステータス
- 各テストケースの詳細

### Sentryにログインすれば更なる詳細が見れる

Sentry Preventダッシュボードでは：

- テストの実行時間
- 不安定なテストの特定
- カバレッジの可視化
- テストトレンドの分析

## 次のステップ

### 1. Sentryにログイン（今すぐ）

- https://mogcia.sentry.io/ にアクセス
- ログイン

### 2. Sentry Preventダッシュボードを確認

- https://mogcia.sentry.io/prevent/signal/ にアクセス
- テスト結果を確認

### 3. GitHub Actionsも確認

- https://github.com/mogcia-app/signal-/actions にアクセス
- 最新のワークフローでテストが成功しているか確認

## 困った時

### Sentryアカウントがない場合

1. https://mogcia.sentry.io/ にアクセス
2. **Register** をクリック
3. アカウントを作成

### 組織に参加する必要がある場合

1. **Request to Join** をクリック
2. mogcia組織への参加リクエストを送信
3. 管理者が承認したらアクセス可能に

## まとめ

### 確認できるもの

- ✅ GitHub Actions: ログイン不要で確認可能
- ⚠️ Sentry Prevent: ログインが必要

### 今やること

1. https://mogcia.sentry.io/ にログイン
2. https://mogcia.sentry.io/prevent/signal/ にアクセス
3. テスト結果を確認
