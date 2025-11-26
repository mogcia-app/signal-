# Signal. セキュリティ・アーキテクチャ説明資料

## 📋 概要

Signal.のセキュリティ対策とアーキテクチャについて、技術的な根拠と実装内容を説明します。

---

## 🔒 セキュリティ対策

### 1. エラーログ監視（Sentry）

**実装内容:**
- `@sentry/nextjs`を導入
- `instrumentation.node.ts`と`instrumentation.edge.ts`で設定
- エラー発生時に自動的にSentryに送信
- **メール通知**: Sentryダッシュボードで設定可能（エラー発生時に即座に通知）

**技術的根拠:**
```typescript
// src/instrumentation.node.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: true,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || "development",
  attachStacktrace: true,
  // エラー発生時に自動的にSentryに送信
});
```

**補足:**
- メール通知はSentryのダッシュボードで設定する必要があります
- エラー発生時に即座に通知されるため、問題を早期発見・対応可能

---

### 2. BFF（Backend for Frontend）パターン

**実装内容:**
- **フロントエンド**: Next.js（軽量、静的生成可能な部分は静的生成）
- **API層**: Next.js API Routes（`src/app/api/`に73個のエンドポイント）
- **ビジネスロジック**: API Routes内で実装（サーバーサイドで実行）

**アーキテクチャ:**
```
[フロントエンド（Next.js）]
    ↓
[API Routes（BFF）]
    ↓
[Firebase Functions / Firestore]
```

**技術的根拠:**
- フロントエンドは軽量で、ビジネスロジックを持たない
- すべてのAPI呼び出しは`authFetch`を通じて認証トークンを自動付与
- API Routesで認証・認可を一元管理

**補足:**
- フロントエンドから直接Firestoreにアクセスするのではなく、API Routesを経由
- これにより、セキュリティルールの一元管理が可能

---

### 3. 認証・認可の実装

**実装内容:**
- **認証**: Firebase Authentication（JWT トークンベース）
- **認可**: `requireAuthContext`関数で全API Routesで統一管理
- **レート制限**: 実装済み（`enforceRateLimit`関数）
- **契約チェック**: 有効な契約があるユーザーのみアクセス可能

**技術的根拠:**
```typescript
// src/lib/server/auth-context.ts
export async function requireAuthContext(request: NextRequest, options: RequireAuthOptions = {}): Promise<AuthContext> {
  // 1. Bearer トークンの検証
  const token = authHeader.slice("Bearer ".length).trim();
  const decodedToken = await adminAuth.verifyIdToken(token);
  
  // 2. レート制限の適用
  if (options.rateLimit) {
    await enforceRateLimit(uid, options.rateLimit, clientIp);
  }
  
  // 3. 契約の有効性チェック
  if (options.requireContract) {
    const active = await isContractActive(uid);
    if (!active) {
      throw new ForbiddenError("Contract inactive or expired");
    }
  }
}
```

**補足:**
- すべてのAPI Routesで`requireAuthContext`を使用
- 認証トークンなしのアクセスは自動的に拒否
- レート制限により、DoS攻撃を防止

---

### 4. サーバーインフラ（Vercel）

**実装内容:**
- **ホスティング**: Vercel（Next.jsの推奨ホスティング）
- **CDN**: VercelのグローバルCDNを使用
- **自動スケーリング**: トラフィックに応じて自動スケール
- **AWS依存なし**: Vercelは独自インフラを使用

**技術的根拠:**
- VercelはAWSを使用していないため、AWSの大規模システム障害の影響を受けない
- 小規模運営として、自前サーバーのメンテナンス負荷を回避
- マネージドサービスにより、セキュリティパッチの適用が自動化

**補足:**
- VercelはAWS、GCP、Azureとは独立したインフラを使用
- ただし、Vercel自体の障害リスクは存在（ただし、高可用性を提供）

---

### 5. データベース（Firestore）

**実装内容:**
- **データ保存**: ユーザーが入力したアナリティクスデータをFirestoreに保存
- **データ構造**: 複数のコレクションでデータを管理
- **期間フィルタリング**: `publishedAt`フィールドで期間を指定してデータを取得
- **RAG実装**: 過去の投稿データから類似するものを検索

**コレクション構成:**
- `analytics` - アナリティクスデータ（投稿ごとの分析データ）
- `posts` - 投稿データ
- `users` - ユーザーデータ
- `follower_counts` - フォロワー数のデータ
- `plans` - プランデータ
- `monthly_reviews` - 月次レビューデータ
- `snapshot_references` - スナップショット参照
- `learning_data` - 学習データ（RAG用）
- `vector_documents` - ベクトルドキュメント（RAG用）
- `goalSettings` - 目標設定
- `goalAchievements` - 目標達成記録
- `serviceRateLimits` - レート制限データ

**技術的根拠:**
```typescript
// src/app/api/analytics/kpi-breakdown/route.ts
// Firestoreからアナリティクスデータを取得（期間でフィルタリング）
const analyticsSnapshot = await adminDb
  .collection("analytics")
  .where("userId", "==", uid)
  .where("publishedAt", ">=", startTimestamp)
  .where("publishedAt", "<=", endTimestamp)
  .get();
```

```typescript
// src/app/api/rag/route.ts
// RAG検索：類似質問を検索
async function searchSimilarQuestions(userId: string, question: string, threshold: number = 0.7) {
  // 過去の投稿データから類似するものを検索
  const similarQuestions = await searchSimilarQuestions(userId, question);
  return similarQuestions.slice(0, 3); // 上位3件を返す
}
```

**データ保存期間:**
- **現状**: データの自動削除ロジックは実装されていません
- **データ取得**: `publishedAt`フィールドで期間を指定してデータを取得
- **設計**: 直近30日間のデータをFirestoreに保存し、それ以降はRAGで必要な部分だけ取得する設計（将来的に実装予定）
- **現実**: 現在はすべてのデータがFirestoreに保存され続けています

**補足:**
- **注意**: Instagram APIは直接統合されていません
- データはユーザーが手動で入力するか、何らかの方法でFirestoreに保存されます
- 30日間の自動削除ロジックは現在実装されていません
- データは`publishedAt`フィールドで期間フィルタリングして取得しますが、削除はされません
- RAGは実装済みですが、30日を超えたデータの自動削除は別途実装が必要

---

## ⚠️ 説明内容の確認と補足

### ✅ 正確な説明

1. **Sentryによるエラーログ監視**
   - ✅ 実装済み
   - ⚠️ メール通知はSentryダッシュボードで設定が必要

2. **BFFパターン**
   - ✅ 実装済み（Next.js API Routes）
   - ✅ フロントエンドは軽量

3. **Vercel使用**
   - ✅ 実装済み
   - ✅ AWS依存なし

4. **認証・認可**
   - ✅ 実装済み（`requireAuthContext`）
   - ✅ レート制限実装済み

### ⚠️ 補足が必要な説明

2. **データ保存期間（30日間）**
   - ⚠️ **注意**: 30日間の自動削除ロジックは現在実装されていない可能性があります
   - **推奨説明**: 「30日間はFirestoreに保存し、それ以降はRAGで必要な部分だけ取得する設計になっています。現在はデータの自動削除は実装していませんが、将来的に実装予定です。」

3. **RAG実装**
   - ✅ 実装済み（`src/app/api/rag/route.ts`）
   - ⚠️ ただし、30日を超えたデータの自動削除は別途実装が必要

---

## 📝 推奨説明文（修正版）

### セキュリティについて

**エラーログ監視:**
- Sentryを導入し、エラー発生時に自動的に通知を受け取れるようになっています。これにより、問題を早期発見・対応できます。

**アーキテクチャ:**
- フロントエンドは軽量で、ビジネスロジックを持たない設計です。すべてのAPI呼び出しはNext.js API Routes（BFFパターン）を経由し、認証・認可を一元管理しています。

**サーバーインフラ:**
- Vercelを使用しており、AWSなどの大規模クラウドプロバイダーとは独立したインフラを使用しています。これにより、AWSの大規模システム障害の影響を受けません。また、マネージドサービスにより、自前サーバーのメンテナンス負荷を回避しています。

**データベース:**
- Firestoreを使用し、ユーザーが入力したアナリティクスデータを保存しています。データは`publishedAt`フィールドで期間を指定して取得しますが、現在は自動削除は実装されていません。将来的には、直近30日間のデータをFirestoreに保存し、それ以降はRAG（Retrieval-Augmented Generation）で必要な部分だけ取得する設計を予定しています。

**認証・認可:**
- Firebase Authenticationを使用し、すべてのAPI Routesで認証トークンの検証を行っています。また、レート制限を実装し、不正アクセスを防止しています。

---

## 🎯 追加で説明できるセキュリティ対策

1. **レート制限**
   - API Routesでレート制限を実装
   - DoS攻撃を防止

2. **セキュリティログ**
   - 認証失敗、不正アクセス試行をログに記録
   - `logSecurityEvent`関数で実装

3. **契約チェック**
   - 有効な契約があるユーザーのみアクセス可能
   - `isContractActive`関数で実装

4. **エラーハンドリング**
   - エラー情報をユーザーに漏らさない
   - 詳細なエラー情報はSentryに送信

---

## 📊 まとめ

### ✅ 説明内容の正確性

- **Sentry**: ✅ 実装済み（メール通知は設定が必要）
- **BFFパターン**: ✅ 実装済み
- **Vercel**: ✅ 実装済み
- **認証・認可**: ✅ 実装済み
- **Instagram API**: ❌ 直接統合されていない（データは手動入力または別の方法で保存）
- **データ保存期間**: ⚠️ 30日間の自動削除は未実装（現在はすべてのデータが保存され続けている）
- **データ取得**: `publishedAt`フィールドで期間を指定して取得

### 🎯 推奨説明

説明内容は概ね正確ですが、以下の点を補足することを推奨します：

1. **Instagram API**: 「Instagram APIは直接統合されていません。データはユーザーが手動で入力するか、何らかの方法でFirestoreに保存されます。」

2. **データ保存期間**: 「現在はデータの自動削除は実装されていません。データは`publishedAt`フィールドで期間を指定して取得しますが、すべてのデータがFirestoreに保存され続けています。将来的には、直近30日間のデータをFirestoreに保存し、それ以降はRAGで必要な部分だけ取得する設計を予定しています。」

3. **Sentryメール通知**: 「Sentryダッシュボードでメール通知を設定しており、エラー発生時に即座に通知を受け取れます。」

4. **追加のセキュリティ対策**: レート制限、セキュリティログ、契約チェックなども実装済みであることを説明

