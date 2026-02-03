# サポートID実装計画

## 📋 概要

ランダムなサポートIDを付与し、IPアドレスを補助情報として活用する設計を実装します。
これにより、サポート対応の効率化とセキュリティ向上を実現します。

## 🎯 設計思想

### サポートID（主キー）
- **ランダム生成**: UUID v4を使用
- **個人情報ではない**: 漏洩しても被害ゼロ
- **統合軸**: エラー履歴、操作ログ、学習データ、サポート対応履歴を1点で束ねる

### IPアドレス（補助情報）
- **時系列で複数保持**: 上書きしない
- **異常検知**: 同一サポートID × IP急変、同一IP × 複数サポートIDなどを検知
- **セキュリティシグナル**: ウイルス・ボット・共有アカウント検知

### Sentry統合
- `user.id` → サポートID
- `user.ip_address` → IPアドレス
- `tag` → plan, account_type, tenant_idなど

## 📊 データ構造

### UserProfile型の拡張

```typescript
export interface UserProfile {
  // ... 既存フィールド
  supportId?: string; // サポートID（UUID v4、adminで付与）
  ipHistory?: IPHistoryEntry[]; // IPアドレス履歴
}

export interface IPHistoryEntry {
  ip: string; // IPアドレス
  timestamp: string; // 記録日時（ISO 8601）
  userAgent?: string; // User-Agent
  path?: string; // アクセスパス
  method?: string; // HTTPメソッド
}
```

### Firestore構造

```
users/{uid}
  - supportId: string (UUID v4)
  - ipHistory: IPHistoryEntry[]
  - ... 既存フィールド

users/{uid}/ipHistory/{autoId} (サブコレクション、オプション)
  - ip: string
  - timestamp: Timestamp
  - userAgent: string
  - path: string
  - method: string
```

## 🔧 実装内容

### 1. 型定義の更新

**ファイル**: `src/types/user.ts`

- `UserProfile`に`supportId`と`ipHistory`フィールドを追加
- `IPHistoryEntry`型を定義

### 2. IPアドレス記録機能

**ファイル**: `src/lib/server/ip-tracking.ts` (新規作成)

- APIリクエスト時にIPアドレスを記録
- 同一IPの重複記録を避ける（一定時間内の同一IPは記録しない）
- 最大保持件数を設定（例: 最新50件）

### 3. Sentry統合

**ファイル**: 
- `sentry.client.config.ts`
- `src/instrumentation.node.ts`
- `src/contexts/auth-context.tsx`

- ログイン時にSentryにサポートIDを設定
- IPアドレスもSentryに送信
- タグとしてplan, account_typeなどを設定

### 4. 設定画面へのサポートID表示

**ファイル**: `src/app/settings/page.tsx` (新規作成)

- サポートIDを表示
- コピーボタンを実装
- 問い合わせ時に使用する旨を説明

### 5. APIエンドポイント

**ファイル**: `src/app/api/user/support-id/route.ts` (新規作成)

- サポートID取得API（GET）
- サポートIDはadminで付与されるため、取得のみ

## 🔐 セキュリティ考慮事項

### 同一IP推奨ポリシーとの整合性

- **原則**: 同一IP推奨（セキュリティポリシー）
- **例外**: サポートIDで本人性担保

**判定ロジック**:
- サポートID同一 + IPが違う → アラート/要確認フラグ（即ブロックではない）
- サポートID同一 + IP急変（短時間で大幅変更） → 要確認
- 同一IP + 複数サポートID → 共有アカウントの可能性

## 📝 Adminプロジェクトでの実装

詳細は `docs/ops/ADMIN_SUPPORT_ID_GUIDE.md` を参照。

主な実装内容:
1. ユーザー作成時にサポートIDを自動生成
2. 既存ユーザーへのサポートID付与機能
3. サポートIDの再生成機能（必要に応じて）

## 🧪 テスト項目

1. サポートIDの生成と保存
2. IPアドレスの記録（重複回避）
3. SentryへのサポートID送信
4. 設定画面でのサポートID表示とコピー
5. 同一IP推奨ポリシーとの整合性確認

## 📅 実装順序

1. ✅ 型定義の更新
2. ✅ IPアドレス記録機能
3. ✅ Sentry統合
4. ✅ 設定画面の実装
5. ✅ APIエンドポイント
6. ⬜ テスト

## ✅ 実装完了内容

### 1. 型定義の更新 (`src/types/user.ts`)
- `UserProfile`に`supportId`と`ipHistory`フィールドを追加
- `IPHistoryEntry`型を定義

### 2. IPアドレス記録機能 (`src/lib/server/ip-tracking.ts`)
- リクエストからIPアドレスを取得する関数
- IPアドレスをユーザーの履歴に追加する関数（重複回避、最大50件まで保持）
- `src/lib/server/auth-context.ts`でAPIリクエスト時に自動記録

### 3. Sentry統合 (`src/contexts/auth-context.tsx`)
- ログイン時にSentryにサポートIDを設定
- タグとしてplan, account_type, user_idを設定
- ログアウト時にSentryのユーザー情報をクリア

### 4. 設定画面の実装 (`src/app/settings/page.tsx`)
- サポートIDを表示
- コピーボタンを実装
- 問い合わせ時に使用する旨を説明

### 5. APIエンドポイント (`src/app/api/user/support-id/route.ts`)
- サポートID取得API（GET）

## 🔄 次のステップ

1. **Adminプロジェクトでの実装**: `docs/ops/ADMIN_SUPPORT_ID_GUIDE.md`を参照して、サポートIDの付与機能を実装
2. **既存ユーザーへのサポートID付与**: Adminプロジェクトで一括付与を実行
3. **テスト**: 各機能の動作確認

## 🔗 関連ドキュメント

- `docs/ops/ADMIN_SUPPORT_ID_GUIDE.md` - Adminプロジェクト向け実装ガイド
- `docs/sentry/SENTRY_SETUP.md` - Sentry設定ガイド

