# DSNの見つけ方（日本語版Sentry）

## 📍 手順

### 方法1: プロジェクト設定から

1. 左サイドバーで「**プロジェクト**」セクションを展開
2. 「N javascript-nextjs」の右側にある**⚙️ アイコン**をクリック
3. または、今見ている画面の右上の**⚙️ 歯車アイコン**をクリック
4. 「**Client Keys (DSN)**」または「**クライアントキー**」を選択

### 方法2: 設定メニューから

1. 画面左上のSentryロゴの左側にある**⚙️ 歯車アイコン**をクリック
2. 「**プロジェクト**」を選択
3. 「**javascript-nextjs**」を選択
4. 左側のメニューから「**Client Keys**」を選択

### 方法3: URLで直接アクセス

現在のURL: `mogcia.sentry.io/insights/projects/javascript-nextjs/`

以下に変更してみてください：
`mogcia.sentry.io/settings/projects/javascript-nextjs/keys/`

## 🔑 DSNの見た目

DSNは以下のような形式です：

```
https://abc123def4567890@o1234567.ingest.sentry.io/1234567890
```

または

```
https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]
```

## 📋 DSNが見つかったら

`.env.local`ファイルに追加：

```bash
NEXT_PUBLIC_SENTRY_DSN=https://...あなたのDSN...
```
