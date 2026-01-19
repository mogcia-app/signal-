# Signal.ツール側実装ガイド

## 📋 概要

このドキュメントは、Adminプロジェクトで実装された会員サイト管理機能に対応するため、Signal.ツール側（https://signaltool.app/）で実装すべき機能をまとめたものです。

会員サイトからSignal.ツールへの自動ログイン機能を実装します。

---

## 🎯 実装が必要な機能一覧

### 1. 会員サイトからの自動ログイン（認証コールバック）
### 2. Custom Token生成API
### 3. Firebase Admin SDKの初期化
### 4. **プラン階層別アクセス制御** ⚠️ **重要：これが実装されていないと全機能が見れてしまいます**

---

## ⚠️ 重要な注意事項

**現在、梅プラン（ume）を選択してもSignal.ツール内の全ページが見れる状態になっています。これは、プラン階層別アクセス制御が実装されていないためです。**

Adminプロジェクト側では`planTier`が正しく保存されていますが、Signal.ツール側でこの値を使用してアクセス制御を行う必要があります。

---

## 1. 会員サイトからの自動ログイン機能

### 概要

会員サイトでユーザーが「Signal.ツールにアクセス」ボタンをクリックした際、Signal.ツール側で自動的にログイン処理を行う機能です。

Adminサイトでユーザー作成時に生成された`signalToolAccessUrl`（例: `https://signaltool.app/auth/callback?userId=xxx`）にアクセスすると、userIdからCustom Tokenを生成して自動ログインします。

### 1-1. 認証コールバックページ

**ファイル: `src/app/auth/callback/page.tsx`** （新規作成）

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URLクエリパラメータからuserIdを取得
        const userId = searchParams.get('userId')

        if (!userId) {
          throw new Error('User ID not found')
        }

        // サーバーサイドでCustom Tokenを生成するAPIを呼び出す
        const response = await fetch('/api/auth/generate-custom-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        })

        if (!response.ok) {
          throw new Error('Failed to generate token')
        }

        const { customToken } = await response.json()

        // Custom Tokenでログイン
        await signInWithCustomToken(auth, customToken)

        // ログイン成功後、投稿ラボ（フィード）へリダイレクト（全プラン共通）
        router.push('/instagram/lab/feed')
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err instanceof Error ? err.message : '認証に失敗しました')
      }
    }

    handleCallback()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">認証エラー</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            ログインページに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p>ログイン中...</p>
      </div>
    </div>
  )
}
```

---

## 2. Custom Token生成API

### 概要

userIdを受け取り、Firebase Admin SDKを使用してCustom Tokenを生成するAPIエンドポイントです。

### 2-1. Custom Token生成APIの実装

**ファイル: `src/app/api/auth/generate-custom-token/route.ts`** （新規作成）

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { adminApp } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // userIdの検証（Firestoreでユーザーが存在することを確認）
    const db = getFirestore(adminApp)
    const userDoc = await db.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    
    // ユーザーがアクティブかどうか確認
    if (userData?.status !== 'active') {
      return NextResponse.json(
        { error: 'User account is not active' },
        { status: 403 }
      )
    }

    // Firebase Admin SDKでCustom Tokenを生成
    const auth = getAuth(adminApp)
    const customToken = await auth.createCustomToken(userId)

    return NextResponse.json({
      customToken,
    })
  } catch (error) {
    console.error('Error generating custom token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
```

---

## 3. Firebase Admin SDKの初期化

### 概要

サーバーサイドでCustom Tokenを生成するために、Firebase Admin SDKを初期化する必要があります。

### 3-1. Firebase Admin SDKの設定

**ファイル: `src/lib/firebase-admin.ts`** （新規作成）

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Firebase Admin SDKの初期化
const adminApp = getApps().length === 0
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  : getApps()[0]

export const adminAuth = getAuth(adminApp)
export { adminApp }
```

### 3-2. 環境変数の設定

**ファイル: `.env.local`**

```bash
# Firebase Admin SDK（サーバーサイドのみ）
FIREBASE_ADMIN_PROJECT_ID=signal-v1-fc481
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@signal-v1-fc481.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase設定（同一プロジェクトを使用）
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCvX4cKWKtn_qnh3CV-d1UC4GEiVpdPB9w
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=signal-v1-fc481.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=signal-v1-fc481
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=signal-v1-fc481.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=913459926537
NEXT_PUBLIC_FIREBASE_APP_ID=1:913459926537:web:3f27082cdf1e913c444ad8
```

**重要:** Firebase Admin SDKの認証情報は、Firebase Console → プロジェクト設定 → サービスアカウントから取得できます。

### 3-3. firebase-adminパッケージのインストール

```bash
npm install firebase-admin
```

---

## 4. 認証フロー

### フロー図

```
1. Adminサイトでユーザー作成
   ↓
2. signalToolAccessUrlが生成され、Firestoreに保存
   （例: https://signaltool.app/auth/callback?userId=xxx）
   ↓
3. 会員サイトでログイン後、ユーザープロファイルからURLを取得
   ↓
4. ダッシュボードに「Signal.ツールにアクセス」ボタンを表示
   ↓
5. ユーザーがボタンをクリック
   ↓
6. Signal.ツールの認証コールバックページ（/auth/callback?userId=xxx）にアクセス
   ↓
7. クライアント側：userIdを取得
   ↓
8. クライアント側：/api/auth/generate-custom-token APIを呼び出し
   ↓
9. サーバー側：userIdを検証（Firestoreでユーザーが存在することを確認）
   ↓
10. サーバー側：Firebase Admin SDKでCustom Tokenを生成
   ↓
11. クライアント側：Custom Tokenを受け取り
   ↓
12. クライアント側：signInWithCustomTokenでログイン
   ↓
13. ダッシュボードへリダイレクト
```

---

## 5. セキュリティ考慮事項

### 5-1. userIdの検証

- Signal.ツール側でuserIdが有効なユーザーIDであることを確認
- Firestoreでユーザーが存在することを確認してからCustom Tokenを生成
- ユーザーがアクティブ（`status === 'active'`）であることを確認

### 5-2. HTTPS必須

- すべての通信はHTTPSを使用
- 本番環境では必ずHTTPSを有効化

### 5-3. URLの有効性

- Adminサイトで生成されたURLのみが有効
- 勝手に生成されたuserIdではログインできないようにする（Firestoreでの検証により保護）

### 5-4. トークンの有効期限

- Custom Tokenは短時間（5分）の有効期限
- 使用後は即座に無効化される

---

## 6. 会員サイトとSignal.ツール間で共有すべき情報

### 6-1. Firebase設定（必須）

両方のアプリケーションで**同じFirebaseプロジェクト**を使用します。

```bash
# 共有する環境変数
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCvX4cKWKtn_qnh3CV-d1UC4GEiVpdPB9w
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=signal-v1-fc481.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=signal-v1-fc481
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=signal-v1-fc481.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=913459926537
NEXT_PUBLIC_FIREBASE_APP_ID=1:913459926537:web:3f27082cdf1e913c444ad8
```

### 6-2. Firestoreセキュリティルール

両方のアプリケーションで同じFirestoreを使用するため、セキュリティルールを適切に設定します。

**重要:**
- Signal.ツール側のユーザーは`users`コレクションを読み取り可能
- 認証済みユーザーは自分のデータのみ更新可能

### 6-3. Firebase Auth設定

**認証プロバイダー:**
- Email/Password認証を使用
- 同じFirebase Authプロジェクトを使用

**カスタムトークンの生成:**
- Signal.ツール側でCustom Tokenを生成（Firebase Admin SDKを使用）
- Custom TokenでFirebase Authにログイン

### 6-4. データモデルの共有

両方のアプリケーションで同じデータモデルを使用します：

- `users/{uid}` - ユーザープロファイル
- `users/{uid}/planHistory/{autoId}` - プラン変更履歴

---

## 7. 実装チェックリスト

### ✅ Signal.ツール側で実装が必要な項目

- [ ] **`src/app/auth/callback/page.tsx`の作成**
  - URLクエリパラメータからuserIdを取得
  - Custom Token生成APIを呼び出し
  - Custom Tokenでログイン処理
  - ダッシュボードへリダイレクト

- [ ] **`src/app/api/auth/generate-custom-token/route.ts`の作成**
  - userIdを受け取る
  - Firestoreでユーザーの存在確認
  - ユーザーがアクティブか確認
  - Firebase Admin SDKでCustom Tokenを生成
  - Custom Tokenを返す

- [ ] **`src/lib/firebase-admin.ts`の作成**
  - Firebase Admin SDKの初期化
  - 認証情報の設定（環境変数から読み込み）

- [ ] **環境変数の設定**
  - `FIREBASE_ADMIN_PROJECT_ID`
  - `FIREBASE_ADMIN_CLIENT_EMAIL`
  - `FIREBASE_ADMIN_PRIVATE_KEY`
  - Firebase設定（同一プロジェクト）

- [ ] **`firebase-admin`パッケージのインストール**
  ```bash
  npm install firebase-admin
  ```

- [ ] **Firestoreセキュリティルールの確認**
  - 認証済みユーザーが自分のデータを読み取れることを確認

- [ ] **⚠️ プラン階層別アクセス制御の実装**（重要！）
  - `src/lib/plan-access.ts` の作成
  - 各ページコンポーネントでのアクセス制御
  - サイドバーナビゲーションの制御
  - APIルートでの制御

---

## 8. トラブルシューティング

### よくある問題

1. **Custom Token生成エラー**
   - Firebase Admin SDKが正しく初期化されているか確認
   - 環境変数が正しく設定されているか確認
   - Firebase Admin SDKの認証情報が有効か確認

2. **userIdが見つからないエラー**
   - Firestoreでユーザーが存在するか確認
   - userIdが正しくURLに含まれているか確認

3. **ユーザーがアクティブでないエラー**
   - Firestoreでユーザーの`status`フィールドが`'active'`であることを確認

---

## 9. プラン階層別アクセス制御の実装 ⚠️ **必須実装**

### ⚠️ 重要：この機能が実装されていないと、どのプランでも全機能が見れてしまいます！

Adminプロジェクトで設定されたユーザーのプラン階層（梅・竹・松）に基づいて、Signal.ツール側での機能アクセスを制御する必要があります。

### 9-1. データ構造

**Firestore `users` コレクションの各ドキュメント:**
```typescript
interface User {
  // ... 既存フィールド
  
  /**
   * プラン階層
   * - "ume": 梅プラン（投稿ラボのみ）
   * - "take": 竹プラン（投稿ラボ + 投稿一覧）
   * - "matsu": 松プラン（全機能）
   * 
   * デフォルト値: "ume" （新規ユーザーは梅プランで開始）
   */
  planTier?: 'ume' | 'take' | 'matsu'
}
```

### 9-2. 型定義の追加

**ファイル: `src/types/user.ts`**

```typescript
export interface UserProfile {
  // ... 既存フィールド
  planTier?: 'ume' | 'take' | 'matsu'
  // ... 既存フィールド
}

export type PlanTier = 'ume' | 'take' | 'matsu'
```

### 9-3. プランチェックユーティリティの作成

**ファイル: `src/lib/plan-access.ts`** （新規作成）

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
  },
  take: {
    canAccessLab: true, // 投稿ラボ
    canAccessPosts: true, // 投稿一覧
    canAccessAnalytics: false, // 投稿分析
    canAccessPlan: false, // 運用計画
    canAccessReport: false, // レポート
    canAccessKPI: false, // KPIダッシュボード
    canAccessLearning: false, // 学習ページ
  },
  matsu: {
    canAccessLab: true, // 投稿ラボ
    canAccessPosts: true, // 投稿一覧
    canAccessAnalytics: true, // 投稿分析
    canAccessPlan: true, // 運用計画
    canAccessReport: true, // レポート
    canAccessKPI: true, // KPIダッシュボード
    canAccessLearning: true, // 学習ページ
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
```

### 9-4. ページコンポーネントでの制御（リダイレクト戦略）

**重要**: フロントエンドでのアクセス制御には、以下の2つのアプローチがありますが、プロジェクト全体で**完全リダイレクト型**を採用してください。

#### 完全リダイレクト型（推奨）

**ファイル: `src/app/instagram/posts/page.tsx`**（例）

```typescript
'use client'

import { useUserProfile } from '@/hooks/useUserProfile'
import { canAccessFeature } from '@/lib/plan-access'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PostsPage() {
  const { userProfile, loading } = useUserProfile()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !canAccessFeature(userProfile, 'canAccessPosts')) {
      // 完全リダイレクト型：早期にリダイレクトしてコンテンツを表示しない
      router.push('/instagram/lab')
    }
  }, [userProfile, loading, router])

  // ローディング中は何も表示しない
  if (loading) {
    return null
  }

  // アクセス権限がない場合は何も表示しない（リダイレクトされる）
  if (!canAccessFeature(userProfile, 'canAccessPosts')) {
    return null
  }

  // ... 通常のページコンテンツ
}
```

**メリット**: 画面のチラつきがなく、UXが良い

#### アクセス制限ページ型（アップグレード導線付き）

もし、リダイレクトではなくアクセス制限ページを表示する場合は、**必ずアップグレード導線を含める**こと：

```typescript
'use client'

import { useUserProfile } from '@/hooks/useUserProfile'
import { canAccessFeature, getAccessDeniedMessage, getUserPlanTier } from '@/lib/plan-access'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PostsPage() {
  const { userProfile, loading } = useUserProfile()
  const router = useRouter()

  if (loading) {
    return <div>読み込み中...</div>
  }

  if (!canAccessFeature(userProfile, 'canAccessPosts')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">機能へのアクセスが制限されています</h2>
          <p className="mb-6 text-gray-600">{getAccessDeniedMessage('投稿一覧')}</p>
          
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
                onClick={() => router.push('/instagram/lab')}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                投稿ラボに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ... 通常のページコンテンツ
}
```

**推奨**: プロジェクト全体で**完全リダイレクト型**を採用し、統一する

### 9-5. 複数機能チェックが必要な場合

**`getPlanAccess()`を使用すると読みやすくなります：**

```typescript
import { getPlanAccess } from '@/lib/plan-access'

const access = getPlanAccess(userProfile)

if (access.canAccessPosts && access.canAccessAnalytics) {
  // 投稿一覧と分析機能の両方が必要な処理
}

// または条件分岐が多い場合
const canUseAdvancedFeatures = 
  access.canAccessAnalytics && 
  access.canAccessPlan && 
  access.canAccessKPI
```

### 9-6. サイドバーナビゲーションの制御

**ファイル: `src/components/sns-layout.tsx`** または類似のレイアウトコンポーネント

```typescript
import { canAccessFeature } from '@/lib/plan-access'

// サイドバー内で条件付きレンダリング
{canAccessFeature(userProfile, 'canAccessPosts') && (
  <Link href="/instagram/posts">投稿一覧</Link>
)}

{canAccessFeature(userProfile, 'canAccessAnalytics') && (
  <Link href="/instagram/analytics/feed">投稿分析</Link>
)}

// または、メニュー項目を無効化して表示する場合
{!canAccessFeature(userProfile, 'canAccessAnalytics') ? (
  <div className="opacity-50 cursor-not-allowed">
    <span>投稿分析</span>
    <span className="text-xs text-gray-500">（アップグレードが必要）</span>
  </div>
) : (
  <Link href="/instagram/analytics/feed">投稿分析</Link>
)}
```

### 9-7. APIルートでの制御

**重要**: フロントエンドでの制御はUX向上のためですが、**セキュリティのためAPI側でも必ずチェック**してください。

**ファイル: `src/app/api/posts/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthContext } from '@/lib/server/auth-context'
import { getUserProfile } from '@/lib/server/user-profile'
import { canAccessFeature } from '@/lib/plan-access'

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireAuthContext(request, {
      requireContract: true,
    })

    const userProfile = await getUserProfile(authContext.uid)

    // プランチェック（必須）
    if (!canAccessFeature(userProfile, 'canAccessPosts')) {
      return NextResponse.json(
        { error: '投稿一覧機能は、現在のプランではご利用いただけません。' },
        { status: 403 }
      )
    }

    // ... 通常のAPI処理
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 9-8. アクセス制御マトリックス

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
| `/home` | ✅ | ✅ | ✅ |

### 9-9. 実装チェックリスト

- [ ] **型定義の追加**（`src/types/user.ts`）
  - `planTier?: 'ume' | 'take' | 'matsu'` を追加

- [ ] **プランチェックユーティリティの作成**（`src/lib/plan-access.ts`）
  - `PLAN_FEATURES` の定義
  - `getUserPlanTier` 関数
  - `canAccessFeature` 関数
  - `getPlanAccess` 関数（複数機能チェック用）
  - `getAccessDeniedMessage` 関数
  - `getPlanTierDisplayName` 関数
  - `getPlanTierPrice` 関数

- [ ] **各ページコンポーネントでの制御**
  - `/instagram/posts` ページ
  - `/instagram/posts/[id]` ページ
  - `/instagram/analytics/*` ページ
  - `/instagram/plan` ページ
  - `/instagram/report` ページ
  - `/instagram/kpi` ページ
  - `/learning` ページ

- [ ] **サイドバーナビゲーションの制御**
  - 条件付きレンダリングでメニュー項目を非表示
  - または、無効化して表示（アップグレード誘導付き）

- [ ] **APIルートでの制御**（必須）
  - 各APIエンドポイントでプランチェック
  - アクセス不可の場合は403エラーを返す

- [ ] **リダイレクト戦略の統一**
  - 完全リダイレクト型を採用（推奨）
  - または、アクセス制限ページ型（アップグレード導線必須）

---

## 10. 将来拡張に向けた設計思想

### 10-1. プラン機能の細分化

現在のfeature名（`canAccessPosts`, `canAccessAnalytics`など）は、将来的に機能が細分化される可能性を考慮して設計されています。

**将来の拡張例:**
- `canAccessPosts` → `canAccessPostList`, `canAccessPostDetail`, `canAccessPostEdit`
- `canAccessAnalytics` → `canAccessPostAnalytics`, `canAccessKPIAnalytics`, `canAccessReelAnalytics`
- `canAccessKPI` → 独立したfeatureとして維持

**拡張時の対応:**
1. `PLAN_FEATURES`に新しいfeatureを追加
2. 既存のfeature名は後方互換性のため残す（または段階的に移行）
3. 各プラン階層で適切な権限を設定

### 10-2. プラン階層の拡張

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

## 11. 参考資料

- [Firebase Admin SDK ドキュメント](https://firebase.google.com/docs/admin/setup)
- [Firebase Custom Token ドキュメント](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Firestore セキュリティルール](https://firebase.google.com/docs/firestore/security/get-started)
- [Next.js App Router](https://nextjs.org/docs/app)
- [プラン階層別アクセス制御仕様書（Adminプロジェクト向け）](./PLAN_TIER_ACCESS_CONTROL_SPEC.md)

---

## 12. 更新履歴

- **2025-01-18**: 初版作成
  - 会員サイトからの自動ログイン機能の実装手順を追加
  - Custom Token生成APIの実装手順を追加
  - Firebase Admin SDKの初期化手順を追加
  - セキュリティ考慮事項を追加
- **2025-01-20**: プラン階層別アクセス制御を追加
  - ⚠️ **重要**: プラン階層別アクセス制御の実装手順を追加
  - この機能が実装されていないと、どのプランでも全機能が見れてしまう問題に対応
  - `getPlanAccess()`関数の追加
  - リダイレクト戦略の統一指針を追加
  - アップグレード導線の実装指針を追加
  - 将来拡張に向けた設計思想を追加

