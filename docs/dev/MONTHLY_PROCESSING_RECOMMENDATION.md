# 月次処理の自動実行方法 - 推奨実装

## 概要

月次処理の自動実行方法について、既存のコードベースを分析した結果、以下の推奨方法を提案します。

## 既存の実装パターン

### 1. Cloud Functions のスケジュール実行（既存実装）

`functions/src/index.ts`で、週次バックアップが`onSchedule`を使用して実装されています：

```typescript
export const weeklyBackup = onSchedule(
  {
    schedule: "0 3 * * 0", // 毎週日曜日 3:00 UTC (JST 12:00)
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (event) => {
    // 処理内容
  }
);
```

### 2. リアルタイム取得（既存実装）

フロントエンドで`useEffect`を使用して、ページロード時や月が変わった時にAPIを呼び出しています：

```typescript
// 例: src/app/instagram/kpi/page.tsx
useEffect(() => {
  if (isAuthReady && selectedMonth) {
    fetchKPIBreakdown(selectedMonth);
  }
}, [isAuthReady, selectedMonth, fetchKPIBreakdown]);
```

## 推奨実装方法

### ✅ 月次処理の自動実行: Cloud Functions の `onSchedule`

**理由**:
1. 既存の週次バックアップと同じパターンで実装可能
2. サーバーレスで自動実行されるため、フロントエンドに依存しない
3. タイムゾーン指定が可能（JST対応）
4. エラーハンドリングとログ記録が容易

**実装例**:

```typescript
// functions/src/index.ts に追加
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

/**
 * 月次処理: 利用開始日時点のフォロワー数を自動更新
 * 毎月1日の午前2時（JST）に実行
 */
export const monthlyFollowerSync = onSchedule(
  {
    schedule: "0 17 1 * *", // 毎月1日 17:00 UTC (JST 2:00)
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
    memory: "256MiB",
    timeoutSeconds: 300, // 5分
  },
  async (event) => {
    const db = admin.firestore();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    
    logger.info("月次フォロワー数同期開始", { currentMonth });

    try {
      // アクティブな全ユーザーを取得
      const usersSnapshot = await db
        .collection("users")
        .where("status", "==", "active")
        .get();

      const results = {
        success: 0,
        skipped: 0,
        errors: 0,
      };

      // 各ユーザーに対して処理を実行
      for (const userDoc of usersSnapshot.docs) {
        try {
          const userId = userDoc.id;
          
          // APIエンドポイントを呼び出し
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com"}/api/user/sync-initial-followers`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // 内部呼び出しの場合は、サービスアカウントのトークンを使用
                // または、APIキーを使用
              },
              body: JSON.stringify({ date: currentMonth }),
            }
          );

          if (response.ok) {
            results.success++;
            logger.info(`ユーザー ${userId} の同期成功`);
          } else {
            const data = await response.json();
            if (data.message?.includes("初回ログイン月")) {
              results.skipped++;
            } else {
              results.errors++;
              logger.error(`ユーザー ${userId} の同期エラー:`, data);
            }
          }
        } catch (error) {
          results.errors++;
          logger.error(`ユーザー ${userDoc.id} の処理エラー:`, error);
        }
      }

      logger.info("月次フォロワー数同期完了", results);
    } catch (error) {
      logger.error("月次フォロワー数同期エラー:", error);
      throw error;
    }
  }
);
```

### ✅ リアルタイム取得: 既存パターンを維持

**理由**:
1. ユーザーがページを開いた時に最新データを取得できる
2. 月が変わった時に自動的にデータを更新できる
3. 既存の実装パターンと一貫性がある

**実装例**（既存のパターン）:

```typescript
// フロントエンドで月が変わった時に自動取得
useEffect(() => {
  if (isAuthReady && selectedMonth) {
    fetchKPIBreakdown(selectedMonth);
  }
}, [isAuthReady, selectedMonth, fetchKPIBreakdown]);
```

## 処理の分類

### 月次処理の自動実行が必要な処理

以下の処理は、**Cloud Functions の `onSchedule`** で自動実行することを推奨します：

1. その他の月次集計処理（将来的に追加する場合）
   - 月次レポートの事前生成
   - 月次統計の集計
   - 月次通知の送信

**注意**: 「利用開始日時点のフォロワー数」は固定値として扱い、自動更新は不要です。表示用の「現在のフォロワー数」は、リアルタイム取得時に「利用開始日時点のフォロワー数 + 累積増加数」で計算します。

### リアルタイム取得で十分な処理

以下の処理は、**既存のリアルタイム取得パターン**を維持することを推奨します：

1. ✅ **KPI分解データの取得** (`/api/analytics/kpi-breakdown`)
   - ユーザーがページを開いた時に取得
   - 月が変わった時に自動更新

2. ✅ **月次レポートサマリーの取得** (`/api/analytics/monthly-report-summary`)
   - ユーザーがページを開いた時に取得
   - キャッシュ機能あり

3. ✅ **月次レビューの取得** (`/api/analytics/monthly-review`)
   - ユーザーがページを開いた時に取得
   - キャッシュ機能あり

## 実装手順

### 1. Cloud Functions に月次処理を追加

```bash
# functions/src/index.ts を編集
# 上記の monthlyFollowerSync 関数を追加
```

### 2. デプロイ

```bash
firebase deploy --only functions:monthlyFollowerSync
```

### 3. 動作確認

- Cloud Functions のログで実行状況を確認
- 初回ログイン月のユーザーはスキップされることを確認
- 2ヶ月目以降のユーザーは正常に更新されることを確認

## 注意事項

1. **内部API呼び出しの認証**
   - Cloud Functions から Next.js API を呼び出す場合、認証が必要
   - サービスアカウントのトークンを使用するか、内部APIキーを設定

2. **エラーハンドリング**
   - 一部のユーザーでエラーが発生しても、他のユーザーの処理を継続
   - エラーログを記録して、後で確認できるようにする

3. **パフォーマンス**
   - 大量のユーザーがいる場合、バッチ処理を検討
   - タイムアウト時間を適切に設定

4. **コスト**
   - Cloud Functions の実行回数と実行時間に応じて課金
   - 月1回の実行なので、コストは低い

## まとめ

- **月次処理の自動実行**: Cloud Functions の `onSchedule` を使用（既存の週次バックアップと同じパターン）
- **リアルタイム取得**: 既存の `useEffect` パターンを維持（ユーザーがページを開いた時に取得）

この方法により、自動実行が必要な処理とリアルタイム取得で十分な処理を適切に分離できます。

