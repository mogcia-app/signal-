# Signal.

Next.js + Firebase Functions を使ったモダンなWebアプリケーション

[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/mogcia-app/signal-?utm_source=oss&utm_medium=github&utm_campaign=mogcia-app%2Fsignal-&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)](https://coderabbit.ai)

## 概要

Signal.は、Instagram運用を最適化するためのAI搭載プラットフォームです。

## 技術スタック

- **フレームワーク**: Next.js
- **バックエンド**: Firebase Functions
- **データベース**: Firestore
- **認証**: Firebase Authentication
- **AI**: OpenAI API

## 開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build
```

## CodeRabbit セットアップ

このプロジェクトでは [CodeRabbit](https://coderabbit.ai) を使用して自動コードレビューを実施しています。

### 初期セットアップ手順

1. **GitHub Appのインストール**
   - [CodeRabbit の Webサイト](https://coderabbit.ai) にアクセス
   - GitHub アカウントでログイン
   - 「Install GitHub App」をクリック
   - `mogcia-app/signal-` リポジトリを選択してインストール

2. **設定ファイル**
   - リポジトリルートの `.coderabbit.yaml` でレビュー動作をカスタマイズ可能
   - デフォルト設定で日本語でのレビューが有効化されています

3. **動作確認**
   - プルリクエストを作成すると、CodeRabbitが自動的にレビューを開始します
   - レビューが完了すると、PRにコメントが追加されます

### トラブルシューティング

CodeRabbitが動作しない場合：

- ✅ GitHub Appが正しくインストールされているか確認
- ✅ リポジトリへのアクセス権限が付与されているか確認
- ✅ プルリクエストが作成・更新されているか確認
- ✅ `.coderabbit.yaml` の設定内容を確認

詳細は [CodeRabbit ドキュメント](https://docs.coderabbit.ai) を参照してください。