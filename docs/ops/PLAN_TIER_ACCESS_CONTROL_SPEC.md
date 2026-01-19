# プラン階層別アクセス制御仕様書（Adminプロジェクト向け）

## 📋 概要

Signal.会員サイトにおいて、ユーザーのプラン階層（梅・竹・松）に応じた機能アクセス制御を実装します。
この仕様書は、会員サイト管理用のAdminプロジェクトでユーザー管理を行う際の参考資料です。

---

## 🎯 プラン階層の定義

### プラン一覧

| プラン名 | 識別子 | 月額料金 | 利用可能機能 |
|---------|--------|---------|-------------|
| **梅プラン** | `ume` | ¥15,000（税込） | 投稿ラボのみ |
| **竹プラン** | `take` | ¥30,000（税込） | 投稿ラボ + 投稿一覧 |
| **松プラン** | `matsu` | ¥60,000（税込） | 全機能（投稿ラボ + 投稿一覧 + 投稿分析 + 運用計画 + レポート） |

---

## 🔐 データモデル変更

### UserProfile 型への追加フィールド

**Firestore `users` コレクションの各ドキュメントに以下のフィールドを追加：**

```typescript
interface UserProfile {
  // ... 既存フィールド
  
  /**
   * プラン階層
   * - "ume": 梅プラン（投稿ラボのみ）
   * - "take": 竹プラン（投稿ラボ + 投稿一覧）
   * - "matsu": 松プラン（全機能）
   * 
   * デフォルト値: "ume" （新規ユーザーは梅プランで開始）
   */
  planTier?: "ume" | "take" | "matsu";
  
  // ... 既存フィールド
}
```

### Adminプロジェクトでの操作

**ユーザープランの設定・変更：**

```javascript
// Firestore Admin SDK使用例
const userRef = admin.firestore().collection('users').doc(userId);

// プランを設定
await userRef.update({
  planTier: 'matsu', // 'ume' | 'take' | 'matsu'
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});
```

---

## 🚫 アクセス制御マトリックス

### 機能別アクセス可否

| 機能カテゴリ | 機能詳細 | 梅プラン | 竹プラン | 松プラン |
|------------|---------|---------|---------|---------|
| **投稿作成** | 投稿ラボ（フィード/リール/ストーリー作成） | ✅ | ✅ | ✅ |
| **投稿管理** | 投稿一覧 | ❌ | ✅ | ✅ |
| **投稿管理** | 投稿詳細・編集 | ❌ | ✅ | ✅ |
| **投稿管理** | 投稿削除 | ❌ | ✅ | ✅ |
| **投稿分析** | 個別投稿分析 | ❌ | ❌ | ✅ |
| **投稿分析** | 分析ページ全体 | ❌ | ❌ | ✅ |
| **運用計画** | AI戦略生成・運用計画作成 | ❌ | ❌ | ✅ |
| **運用計画** | シミュレーション | ❌ | ❌ | ✅ |
| **レポート** | 月次レポート | ❌ | ❌ | ✅ |
| **レポート** | 学習ページ | ❌ | ❌ | ✅ |
| **その他** | KPIダッシュボード | ❌ | ❌ | ✅ |

### ページルーティング制御

| ページパス | 梅プラン | 竹プラン | 松プラン |
|-----------|---------|---------|---------|
| `/instagram/lab/*` | ✅ | ✅ | ✅ |
| `/instagram/posts` | ❌ | ✅ | ✅ |
| `/instagram/posts/[id]` | ❌ | ✅ | ✅ |
| `/instagram/analytics/*` | ❌ | ❌ | ✅ |
| `/instagram/plan` | ❌ | ❌ | ✅ |
| `/instagram/report` | ❌ | ❌ | ✅ |
| `/instagram/kpi` | ❌ | ❌ | ✅ |
| `/learning` | ❌ | ❌ | ✅ |
| `/home` | ❌ | ❌ | ✅ |

---

## 🔧 実装方法

### 1. 型定義の追加

**ファイル: `src/types/user.ts`**

```typescript
export interface UserProfile {
  // ... 既存フィールド
  planTier?: "ume" | "take" | "matsu";
  // ... 既存フィールド
}
```

### 2. プランチェックユーティリティ

**ファイル: `src/lib/plan-access.ts` （新規作成）**

```typescript
/**
 * プラン階層別アクセス制御ユーティリティ
 * 
 * ユーザーのプラン階層（梅・竹・松）に基づいて、各機能へのアクセス権限を管理します。
 */

import { UserProfile } from "@/types/user";

export type PlanTier = "ume" | "take" | "matsu";

/**
 * 各プラン階層で利用可能な機能の定義
 * 
 * 注意: 将来的に機能の細分化（例: 投稿分析の一部のみ開放など）が必要になった場合は、
 * より詳細な粒度でfeature名を分割してください。
 * 
 * 例: canAccessPosts → canAccessPostList, canAccessPostDetail
 * 例: canAccessAnalytics → canAccessPostAnalytics, canAccessKPIAnalytics
 */
export const PLAN_FEATURES = {
  ume: {
    canAccessLab: true, // 投稿ラボ
    canAccessPosts: false, // 投稿一覧（将来的には canAccessPostList, canAccessPostDetail に分割可能）
    canAccessAnalytics: false, // 投稿分析（将来的には canAccessPostAnalytics, canAccessKPIAnalytics に分割可能）
    canAccessPlan: false, // 運用計画
    canAccessReport: false, // レポート
    canAccessKPI: false, // KPIダッシュボード（将来的には canAccessKPI として独立）
    canAccessLearning: false, // 学習ページ
    canAccessHome: false, // ホームページ
  },
  take: {
    canAccessLab: true, // 投稿ラボ
    canAccessPosts: true, // 投稿一覧
    canAccessAnalytics: false, // 投稿分析
    canAccessPlan: false, // 運用計画
    canAccessReport: false, // レポート
    canAccessKPI: false, // KPIダッシュボード
    canAccessLearning: false, // 学習ページ
    canAccessHome: false, // ホームページ
  },
  matsu: {
    canAccessLab: true, // 投稿ラボ
    canAccessPosts: true, // 投稿一覧
    canAccessAnalytics: true, // 投稿分析
    canAccessPlan: true, // 運用計画
    canAccessReport: true, // レポート
    canAccessKPI: true, // KPIダッシュボード
    canAccessLearning: true, // 学習ページ
    canAccessHome: true, // ホームページ
  },
} as const;

export type PlanFeature = keyof typeof PLAN_FEATURES.ume;

/**
 * プランアクセス情報の型
 */
export type PlanAccess = typeof PLAN_FEATURES[PlanTier];

/**
 * ユーザーのプラン階層を取得（デフォルトは"ume"）
 * 
 * @param userProfile - ユーザープロフィール
 * @returns プラン階層
 */
export function getUserPlanTier(userProfile: UserProfile | null | undefined): PlanTier {
  return userProfile?.planTier || "ume";
}

/**
 * 特定機能へのアクセス権限をチェック
 * 
 * @param userProfile - ユーザープロフィール
 * @param feature - チェックする機能名
 * @returns アクセス可能な場合true
 */
export function canAccessFeature(
  userProfile: UserProfile | null | undefined,
  feature: PlanFeature
): boolean {
  const tier = getUserPlanTier(userProfile);
  return PLAN_FEATURES[tier][feature];
}

/**
 * ユーザーのプランアクセス情報をまとめて取得
 * 
 * 複数の機能チェックが必要な場合や、条件分岐が多い場合に便利です。
 * 
 * @param userProfile - ユーザープロフィール
 * @returns プランアクセス情報オブジェクト
 * 
 * @example
 * ```typescript
 * const access = getPlanAccess(userProfile);
 * if (access.canAccessPosts) {
 *   // 投稿一覧へのアクセス処理
 * }
 * if (access.canAccessAnalytics && access.canAccessKPI) {
 *   // 分析関連の処理
 * }
 * ```
 */
export function getPlanAccess(
  userProfile: UserProfile | null | undefined
): PlanAccess {
  const tier = getUserPlanTier(userProfile);
  return PLAN_FEATURES[tier];
}

/**
 * プラン階層に基づいてアクセス拒否メッセージを取得
 * 
 * @param feature - 機能名
 * @returns アクセス拒否メッセージ
 */
export function getAccessDeniedMessage(feature: string): string {
  return `${feature}機能は、現在のプランではご利用いただけません。プランのアップグレードをご検討ください。`;
}

/**
 * プラン階層の表示名を取得
 * 
 * @param tier - プラン階層
 * @returns 表示名
 */
export function getPlanTierDisplayName(tier: PlanTier): string {
  const names = {
    ume: "梅プラン",
    take: "竹プラン",
    matsu: "松プラン",
  };
  return names[tier];
}

/**
 * プラン階層の月額料金を取得
 * 
 * @param tier - プラン階層
 * @returns 月額料金（税込）
 */
export function getPlanTierPrice(tier: PlanTier): number {
  const prices = {
    ume: 15000,
    take: 30000,
    matsu: 60000,
  };
  return prices[tier];
}

/**
 * ユーザーのプランアクセス情報をまとめて取得
 * 
 * 複数の機能チェックが必要な場合や、条件分岐が多い場合に便利です。
 * 
 * @param userProfile - ユーザープロフィール
 * @returns プランアクセス情報オブジェクト
 * 
 * @example
 * ```typescript
 * const access = getPlanAccess(userProfile);
 * if (access.canAccessPosts) {
 *   // 投稿一覧へのアクセス処理
 * }
 * if (access.canAccessAnalytics && access.canAccessKPI) {
 *   // 分析関連の処理
 * }
 * ```
 */
export function getPlanAccess(
  userProfile: UserProfile | null | undefined
): PlanAccess {
  const tier = getUserPlanTier(userProfile);
  return PLAN_FEATURES[tier];
}

/**
 * プラン階層の表示名を取得
 */
export function getPlanTierDisplayName(tier: PlanTier): string {
  const names = {
    ume: "梅プラン",
    take: "竹プラン",
    matsu: "松プラン",
  };
  return names[tier];
}

/**
 * プラン階層の月額料金を取得
 */
export function getPlanTierPrice(tier: PlanTier): number {
  const prices = {
    ume: 15000,
    take: 30000,
    matsu: 60000,
  };
  return prices[tier];
}
```

### 3. フロントエンドでの制御（リダイレクト戦略）

**重要**: フロントエンドでのアクセス制御には、以下の2つのアプローチがありますが、プロジェクト全体で**完全リダイレクト型**を採用してください。

#### アプローチA: 完全リダイレクト型（推奨）

**ページコンポーネントでの使用例：**

```typescript
// src/app/instagram/posts/page.tsx
"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature } from "@/lib/plan-access";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PostsPage() {
  const { userProfile, loading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !canAccessFeature(userProfile, "canAccessPosts")) {
      // 完全リダイレクト型：早期にリダイレクトしてコンテンツを表示しない
      router.push("/instagram/lab");
    }
  }, [userProfile, loading, router]);

  // ローディング中は何も表示しない
  if (loading) {
    return null;
  }

  // アクセス権限がない場合は何も表示しない（リダイレクトされる）
  if (!canAccessFeature(userProfile, "canAccessPosts")) {
    return null;
  }

  // ... 通常のページコンテンツ
}
```

**メリット**: 画面のチラつきがなく、UXが良い

#### アプローチB: アクセス制限ページ型（アップグレード導線付き）

もし、リダイレクトではなくアクセス制限ページを表示する場合は、**必ずアップグレード導線を含める**こと：

```typescript
"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import { canAccessFeature, getAccessDeniedMessage, getUserPlanTier } from "@/lib/plan-access";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PostsPage() {
  const { userProfile, loading } = useUserProfile();
  const router = useRouter();

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (!canAccessFeature(userProfile, "canAccessPosts")) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">機能へのアクセスが制限されています</h2>
          <p className="mb-6 text-gray-600">{getAccessDeniedMessage("投稿一覧")}</p>
          
          {/* アップグレード導線 - 必須 */}
          <div className="space-y-4">
            <Link 
              href="/upgrade" 
              className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
            >
              プランをアップグレードする
            </Link>
            <div>
              <button
                onClick={() => router.push("/instagram/lab")}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                投稿ラボに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ... 通常のページコンテンツ
}
```

**推奨**: プロジェクト全体で**完全リダイレクト型**を採用し、統一する

### 4. サイドバーナビゲーションの制御

**ファイル: `src/components/sns-layout.tsx`**

```typescript
import { canAccessFeature } from "@/lib/plan-access";

// サイドバー内で条件付きレンダリング
{canAccessFeature(userProfile, "canAccessPosts") && (
  <Link href="/instagram/posts">投稿一覧</Link>
)}

{canAccessFeature(userProfile, "canAccessAnalytics") && (
  <Link href="/instagram/analytics/feed">投稿分析</Link>
)}
```

### 5. APIルートでの制御

**APIルートでの使用例：**

```typescript
// src/app/api/posts/route.ts
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { ForbiddenError } from "@/lib/server/errors";

export async function GET(request: NextRequest) {
  const authContext = await requireAuthContext(request, {
    requireContract: true,
  });

  const userProfile = await getUserProfile(authContext.uid);

  // プランチェック
  if (!canAccessFeature(userProfile, "canAccessPosts")) {
    throw new ForbiddenError(
      "投稿一覧機能は、現在のプランではご利用いただけません。"
    );
  }

  // ... 通常のAPI処理
}
```

### 5. 複数機能チェックが必要な場合

**`getPlanAccess()`を使用すると読みやすくなります：**

```typescript
import { getPlanAccess } from "@/lib/plan-access";

const access = getPlanAccess(userProfile);

if (access.canAccessPosts && access.canAccessAnalytics) {
  // 投稿一覧と分析機能の両方が必要な処理
}

// または条件分岐が多い場合
const canUseAdvancedFeatures = 
  access.canAccessAnalytics && 
  access.canAccessPlan && 
  access.canAccessKPI;
```

### 6. ログイン後のリダイレクト先

**重要**: ログイン成功後は、全プラン共通で`/instagram/lab/feed`（投稿ラボ・フィード）にリダイレクトしてください。

**実装例：**

```typescript
// src/app/login/page.tsx
await signIn(email, password);
setLoginSuccess(true);
// 2秒後に投稿ラボ（フィード）に遷移（全プラン共通）
setTimeout(() => {
  router.push("/instagram/lab/feed");
}, 2000);
```

**理由:**
- 梅プラン・竹プランでは`/home`ページにアクセスできないため、利用可能なページ（投稿ラボ）へリダイレクト
- 松プランでも統一されたログイン後の体験を提供

---

## 📝 Adminプロジェクトでの実装チェックリスト

### ユーザー管理画面での実装

- [ ] ユーザー一覧画面に「プラン階層」列を追加
- [ ] ユーザー詳細画面でプラン階層を表示・編集可能にする
- [ ] プラン変更時のバリデーション（有効な値: `ume`, `take`, `matsu`）
- [ ] プラン変更履歴の記録（オプション）

### データ移行

- [ ] 既存ユーザーへのデフォルトプラン設定（推奨: `ume`）
- [ ] プラン未設定ユーザーへのデフォルト値適用ロジック

### プラン変更履歴の実装

**推奨**: プラン変更履歴をログとして記録します。

**Firestore構造:**

```
users/{uid}/planHistory/{autoId}
  - from: "ume" | "take" | "matsu" | null
  - to: "ume" | "take" | "matsu"
  - changedBy: string (AdminユーザーID)
  - reason?: string (変更理由)
  - changedAt: Timestamp
```

**Adminプロジェクトでの実装例:**

```javascript
async function updateUserPlan(userId, newTier, changedBy, reason) {
  const userRef = admin.firestore().collection('users').doc(userId);
  const userDoc = await userRef.get();
  const currentTier = userDoc.data()?.planTier || null;

  // プラン変更履歴を記録
  await admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('planHistory')
    .add({
      from: currentTier,
      to: newTier,
      changedBy: changedBy,
      reason: reason || null,
      changedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  // プランを更新
  await userRef.update({
    planTier: newTier,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
```

**メリット:**
- 請求トラブル時の証跡として利用可能
- 問い合わせ対応時の履歴確認に便利
- プラン変更パターンの分析に活用可能

### 検証

- [ ] 各プラン階層でアクセス可能な機能の動作確認
- [ ] アクセス制限されたページへのアクセス時のリダイレクト確認
- [ ] APIエンドポイントでのプランチェック動作確認

---

## 🔄 プラン変更フロー

### Adminプロジェクトでのプラン変更手順

1. **ユーザー詳細画面を開く**
   - 対象ユーザーのIDでFirestoreドキュメントを取得

2. **プラン階層フィールドを更新**
   ```javascript
   await admin.firestore()
     .collection('users')
     .doc(userId)
     .update({
       planTier: 'take', // または 'matsu'
       updatedAt: admin.firestore.FieldValue.serverTimestamp()
     });
   ```

3. **変更通知（オプション）**
   - ユーザーにメール通知を送信
   - または会員サイト内の通知システムを使用

### プラン変更のタイミング

- **即時反映**: プラン階層の変更は即座に反映されます
- **ユーザー側**: 次回ページリロード時に新しい権限が適用されます
- **API側**: 次のAPIリクエスト時から新しい権限が適用されます

---

## ⚠️ 注意事項

### データ整合性

- **必須フィールド**: `planTier`はオプショナルですが、デフォルト値（`ume`）が適用されます
- **有効値チェック**: Adminプロジェクトでプラン変更時、必ず有効な値（`ume`, `take`, `matsu`）のみを受け付けてください

### セキュリティ

- **クライアント側チェック**: フロントエンドでの制御はUX向上のためですが、セキュリティのためAPI側でも必ずチェックしてください
- **Firestoreセキュリティルール**: 会員サイト側で`planTier`フィールドがクライアントから変更できないようにルールを設定してください

### パフォーマンス

- **キャッシュ**: `userProfile`はクライアント側でキャッシュされますが、プラン変更後は即座に反映されない場合があります
- **推奨**: プラン変更後は、ユーザーにページのリロードを促すか、クライアント側で再取得を促してください

### 将来拡張に向けた設計思想

#### プラン機能の細分化

現在のfeature名（`canAccessPosts`, `canAccessAnalytics`など）は、将来的に機能が細分化される可能性を考慮して設計されています。

**将来の拡張例:**
- `canAccessPosts` → `canAccessPostList`, `canAccessPostDetail`, `canAccessPostEdit`
- `canAccessAnalytics` → `canAccessPostAnalytics`, `canAccessKPIAnalytics`, `canAccessReelAnalytics`
- `canAccessKPI` → 独立したfeatureとして維持

**拡張時の対応:**
1. `PLAN_FEATURES`に新しいfeatureを追加
2. 既存のfeature名は後方互換性のため残す（または段階的に移行）
3. 各プラン階層で適切な権限を設定

#### プラン階層の拡張

現在は`planTier`として`"ume" | "take" | "matsu"`のみですが、将来的に以下が追加される可能性があります：
- 年契約プラン（`matsu_annual`など）
- トライアルプラン（`trial`）
- 特別プラン（`enterprise`など）

**拡張時の対応:**
- `PlanTier`型を拡張
- `PLAN_FEATURES`に新しい階層を追加
- 既存ロジックへの影響を最小化する設計を維持

**設計原則:**
- `PLAN_FEATURES`を「真実の源泉」として維持
- プラン階層の判定ロジックを一箇所に集約
- 条件分岐を`PLAN_FEATURES`の参照に置き換える

---

## 📞 サポート・問い合わせ

実装に関する質問や不具合は、Signal.開発チームまでお問い合わせください。

---

## 🎯 実装チェックリスト（Adminプロジェクト）

### 必須実装項目

- [ ] ユーザー一覧画面に「プラン階層」列を追加
- [ ] ユーザー詳細画面でプラン階層を表示・編集可能にする
- [ ] プラン変更時のバリデーション（有効な値: `ume`, `take`, `matsu`）
- [ ] プラン変更履歴の記録機能（`users/{uid}/planHistory`コレクション）
- [ ] 既存ユーザーへのデフォルトプラン設定（推奨: `ume`）
- [ ] プラン未設定ユーザーへのデフォルト値適用ロジック

### 推奨実装項目

- [ ] プラン変更時のユーザーへの通知機能
- [ ] プラン変更履歴の一覧表示機能
- [ ] プラン変更理由の入力フィールド
- [ ] プラン変更ログのエクスポート機能（請求トラブル対応用）

---

## 📅 更新履歴

- **2025-01-XX**: 初版作成
  - プラン階層定義、アクセス制御マトリックス、実装方法を追加
  - リダイレクト戦略、アップグレード導線、プラン変更履歴を追加
  - 将来拡張に向けた設計思想を追加

