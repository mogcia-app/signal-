# Signal 🔥

Next.js + Firebase Functions を使ったモダンなWebアプリケーション

## 🚀 機能

- ✅ Next.js 15 (App Router)
- ✅ Firebase Functions (Cloud Functions)
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Firebase エミュレータ対応

## 📦 セットアップ

### 1. 依存関係のインストール

```bash
# フロントエンド
npm install

# バックエンド (Firebase Functions)
cd functions && npm install
```

### 2. 開発サーバーの起動

```bash
# Firebase Functions エミュレータ (ターミナル1)
cd functions && npm run serve

# Next.js 開発サーバー (ターミナル2)
npm run dev
```

### 3. アクセス

- フロントエンド: http://localhost:3000
- Firebase Functions: http://127.0.0.1:5001

## 🛠️ 技術スタック

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase Functions, Node.js
- **Development**: Firebase Emulators

## 📁 プロジェクト構造

```
signal/
├── src/
│   ├── app/
│   │   └── page.tsx          # メインページ
│   └── lib/
│       ├── firebase.ts       # Firebase設定
│       └── functions.ts      # Functions呼び出し
├── functions/
│   ├── src/
│   │   └── index.ts          # Cloud Functions
│   ├── package.json
│   └── tsconfig.json
├── firebase.json             # Firebase設定
├── .firebaserc              # プロジェクト設定
└── package.json
```

## 🔧 開発

Firebase Functions の関数を追加・編集する場合は `functions/src/index.ts` を編集してください。

## 🚀 デプロイ

```bash
# Functions のデプロイ
cd functions && npm run deploy

# Next.js のビルド
npm run build
```