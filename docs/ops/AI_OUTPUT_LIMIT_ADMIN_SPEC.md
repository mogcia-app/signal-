# AI出力回数制限 管理画面仕様書（Admin向け）

## 1. 目的
- 管理画面からユーザーごとのAI出力上限を設定できるようにする。
- 現在の固定値（`ume=10`, `take=20`, `matsu=50`）を、運用都合で柔軟に変更可能にする。
- 販売プラン名は「ベーシック / スタンダード / プロ」で統一する。
- 対象機能（共通カウント）:
  - AI投稿文生成
  - 投稿チャットβ
  - 分析チャットβ
  - 月次レポート「再提案する」

---

## 2. 現行実装（2026-02-20時点）
- サーバー側共通ロジック: `/Users/marina/Desktop/signal/src/lib/server/ai-usage-limit.ts`
- 月次カウント保存先: `ai_output_usage_monthly` コレクション
- 既定上限:
  - `ume`: 10回/月
  - `take`: 20回/月
  - `matsu`: 50回/月
- 上限超過時: HTTP `429` + `code: ai_output_limit_exceeded`

### 2.1 プラン名（販売名と内部IDの対応）
| 販売名 | 内部ID |
|---|---|
| ベーシック | `ume` |
| スタンダード | `take` |
| プロ | `matsu` |

注記: 互換性維持のため、当面は内部IDを変更せず販売名のみ変更する。

---

## 3. 要件（Adminで設定可能にする内容）

### 3.1 設定単位
1. 全体デフォルト（プラン別）  
2. ユーザー個別上書き

### 3.2 優先順位
1. ユーザー個別上書き  
2. 全体デフォルト（プラン別）  
3. システム組み込み既定値（フォールバック）

### 3.3 値仕様
- `monthlyLimit: number | null`
  - `null`: 無制限（今回の販売方針では原則使わない）
  - `number`: 0以上の整数
- 想定バリデーション
  - 最小: `0`
  - 最大: `100000`（運用上の安全上限）

---

## 4. データモデル

### 4.1 全体デフォルト（新規）
- コレクション: `app_settings`
- ドキュメントID: `ai_output_limit_defaults`

```ts
{
  ume: { monthlyLimit: number | null },   // ベーシック（例: 10）
  take: { monthlyLimit: number | null },  // スタンダード（例: 20）
  matsu: { monthlyLimit: number | null }, // プロ（例: 50）
  updatedAt: Timestamp,
  updatedBy: string // admin uid
}
```

### 4.2 ユーザー個別上書き（usersへ追加）
- コレクション: `users/{uid}`

```ts
{
  aiOutputLimitOverride?: {
    monthlyLimit: number | null, // 例: 35, null(無制限)
    reason?: string,
    updatedAt: Timestamp,
    updatedBy: string // admin uid
  }
}
```

### 4.3 使用実績（既存）
- コレクション: `ai_output_usage_monthly`
- ドキュメントID: `{uid}_{YYYY-MM}`

```ts
{
  uid: string,
  month: "YYYY-MM",
  tier: "ume" | "take" | "matsu",
  limit: number | null,
  count: number,
  breakdown: {
    home_post_generation?: number,
    home_advisor_chat?: number,
    instagram_posts_advisor_chat?: number,
    analytics_monthly_review?: number
  },
  expiresAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 5. 管理画面UI仕様

### 5.1 画面A: AI回数制限設定（全体）
- セクション名: `AI出力上限（全体デフォルト）`
- 入力項目:
  - ベーシック（月上限）
  - スタンダード（月上限）
  - プロ（月上限）
- 操作:
  - `保存`
  - `既定値に戻す`
- 表示:
  - 最終更新日時
  - 更新者

### 5.2 画面B: ユーザー詳細
- セクション名: `AI出力上限（個別）`
- 表示項目:
  - 現在の有効上限（優先順位適用後）
  - 今月の使用回数 / 残回数
  - 内訳（4機能）
- 操作:
  - `個別上書きを有効化`
  - `月上限` 入力（整数 or 無制限）
  - `理由`（任意）
  - `保存`
  - `個別上書きを解除`

---

## 6. API仕様（Admin）

### 6.1 全体設定
1. `GET /api/admin/ai-output-limits/defaults`
- 返却: プラン別上限 + 更新情報

2. `PUT /api/admin/ai-output-limits/defaults`
- 入力:
```json
{
  "ume": { "monthlyLimit": 10 },
  "take": { "monthlyLimit": 20 },
  "matsu": { "monthlyLimit": 50 }
}
```

### 6.2 ユーザー個別設定
1. `GET /api/admin/users/:uid/ai-output-limit`
- 返却:
  - `effectiveLimit`
  - `source` (`override` | `planDefault` | `systemDefault`)
  - `override`（存在時）
  - `usage`（当月）

2. `PUT /api/admin/users/:uid/ai-output-limit`
- 入力:
```json
{
  "monthlyLimit": 35,
  "reason": "キャンペーン特例"
}
```

3. `DELETE /api/admin/users/:uid/ai-output-limit`
- 動作: 個別上書きを削除し、デフォルト適用へ戻す

### 6.3 権限
- `admin` ロールのみ許可
- すべて監査ログを残す

---

## 7. サービスロジック変更方針
- 対象: `/Users/marina/Desktop/signal/src/lib/server/ai-usage-limit.ts`
- `resolveUsageContext()` を以下順で上限解決するよう変更:
1. `users/{uid}.aiOutputLimitOverride.monthlyLimit`
2. `app_settings/ai_output_limit_defaults.{plan}.monthlyLimit`
3. 現行ハードコード `PLAN_LIMITS`

---

## 8. エッジケース
1. 月途中で上限を下げた場合  
- 即時反映。`count > newLimit` なら次リクエストから429。

2. 月途中で上限を上げた場合  
- 即時反映。残回数が増える。

3. `0`設定  
- 実質利用停止（全AI出力不可）。

4. 有限 → 有限 変更  
- 即時反映。現在の`count`に対して判定。

---

## 9. 受け入れ条件（UAT）
1. Adminでベーシック/スタンダード/プロ上限を変更すると、対象ユーザーに即時反映される。  
2. 特定ユーザーに個別上書き設定すると、プランデフォルトより優先される。  
3. 個別上書きを削除すると、プランデフォルトへ戻る。  
4. 上限超過時は対象4機能すべてで429が返る。  
5. 残回数表示（各画面）が最新値に更新される。  
6. 更新操作が監査ログに残る。

---

## 10. 実装順序（推奨）
1. Firestoreスキーマ追加（`app_settings` / `users`拡張）  
2. Admin API実装（GET/PUT/DELETE）  
3. `ai-usage-limit.ts` の解決順変更  
4. Admin UI実装  
5. 権限・監査ログ追加  
6. E2Eテスト（上限変更→即時反映）  

---

## 11. 補足
- 現在の利用集計は「成功した生成のみ消費」方針。
- 月次レポートは `regenerate=true`（再提案ボタン）時のみ消費。
