# サイドバー各ページでのOnboarding参照分析

作成日: 2026-01-30

## 概要

このドキュメントでは、サイドバーにリンクされている各ページで、onboarding（`/onboarding`）で登録された内容をどのように参照しているかをまとめています。

---

## Onboardingで登録される内容

### 1. ビジネス情報 (`userProfile.businessInfo`)

- **業種** (`industry`)
- **会社規模** (`companySize`)
- **事業形態** (`businessType`)
- **ターゲット市場** (`targetMarket`)
- **キャッチコピー** (`catchphrase`)
- **事業内容** (`description`)
- **初期フォロワー数** (`initialFollowers`)
- **目標** (`goals`)
- **課題** (`challenges`)
- **商品・サービス情報** (`productsOrServices`)

### 2. SNS AI設定 (`userProfile.snsAISettings`)

- **Instagram AI設定** (`snsAISettings.instagram`)
  - **トーン** (`tone`)
  - **マナー・ルール** (`manner`)
  - **注意事項・NGワード** (`cautions`)
  - **運用目標** (`goals`)
  - **活動の動機** (`motivation`)
  - **機能** (`features`)
  - **その他参考情報** (`additionalInfo`)

---

## サイドバーにリンクされているページ一覧

1. **ホーム** (`/home`)
2. **運用計画** (`/instagram/plan`)
3. **フィード投稿ラボ** (`/instagram/lab/feed`)
4. **リール投稿ラボ** (`/instagram/lab/reel`)
5. **ストーリー投稿ラボ** (`/instagram/lab/story`)
6. **投稿一覧** (`/instagram/posts`)
7. **月次レポート** (`/instagram/report`)
8. **KPIコンソール** (`/instagram/kpi`)
9. **学習ダッシュボード** (`/learning`)
10. **マイアカウント** (`/onboarding`)

---

## 各ページでのOnboarding参照詳細

### 1. ホーム (`/home`)

**ファイル**: `src/app/home/page.tsx`

#### 参照内容

- **`userProfile.name`**: ユーザー名の表示
  - 使用箇所: ページ上部の「ようこそ」セクション

#### 参照方法

```typescript
const { userProfile } = useUserProfile();
const userName = userProfile?.name || user?.displayName || "ユーザー";
```

#### 備考

- 直接的なonboardingデータの参照は少ない
- 主にユーザー名の表示に使用

---

### 2. 運用計画 (`/instagram/plan`)

**ファイル**: `src/app/instagram/plan/page.tsx`

#### 参照内容

- **`userProfile.businessInfo.initialFollowers`**: 初期フォロワー数の取得
  - 使用箇所: 計画フォームの初期値として使用

#### 参照方法

```typescript
const { userProfile } = useUserProfile();
// PlanForm.tsx内で使用
const initialFollowers = userProfile?.businessInfo?.initialFollowers || 0;
```

#### AI生成での参照

**API**: `src/app/api/instagram/ai-strategy/route.ts`  
**API**: `src/app/api/instagram/simulation/route.ts`

- **`buildPlanPrompt()`** 関数を使用してAIプロンプトを生成
- 参照されるonboardingデータ:
  - `businessInfo.industry` - 業種
  - `businessInfo.companySize` - 会社規模
  - `businessInfo.targetMarket` - ターゲット市場
  - `businessInfo.goals` - ビジネス目標
  - `businessInfo.challenges` - 課題
  - `businessInfo.catchphrase` - キャッチコピー
  - `businessInfo.productsOrServices` - 商品・サービス情報
  - `snsAISettings.instagram.tone` - トーン
  - `snsAISettings.instagram.manner` - マナー・ルール
  - `snsAISettings.instagram.cautions` - 注意事項・NGワード

#### プロンプトビルダー

**ファイル**: `src/utils/aiPromptBuilder.ts` (386-578行目)

```typescript
export const buildPlanPrompt = (
  userProfile: UserProfile,
  snsType: string,
  formData?: {...},
  simulationResult?: {...}
): string => {
  // onboardingデータを参照してプロンプトを構築
  // - 業種、会社規模、ターゲット市場
  // - ビジネス目標、課題
  // - キャッチコピー、商品・サービス情報
  // - AI設定（トーン、マナー、NGワード）
}
```

---

### 3. フィード投稿ラボ (`/instagram/lab/feed`)

**ファイル**: `src/app/instagram/lab/feed/page.tsx`

#### 参照内容

- **`useBusinessInfo()`** フックを使用してビジネス情報を取得
  - 使用箇所: 投稿生成時のAIプロンプト構築

#### 参照方法

```typescript
const { fetchBusinessInfo } = useBusinessInfo();
```

#### AI生成での参照

**API**: `src/app/api/ai/post-generation/route.ts`

- **`buildFeedPrompt()`** 関数を使用してAIプロンプトを生成
- 参照されるonboardingデータ:
  - `businessInfo.industry` - 業種
  - `businessInfo.companySize` - 会社規模
  - `businessInfo.businessType` - 事業形態
  - `businessInfo.targetMarket` - ターゲット市場
  - `businessInfo.catchphrase` - キャッチコピー
  - `businessInfo.description` - 事業内容
  - `businessInfo.productsOrServices` - 商品・サービス情報（自然に織り込む）
  - `businessInfo.goals` - 目標
  - `businessInfo.challenges` - 課題
  - `snsAISettings.instagram.tone` - トーン
  - `snsAISettings.instagram.manner` - マナー・ルール
  - `snsAISettings.instagram.cautions` - 注意事項・NGワード
  - `snsAISettings.instagram.goals` - Instagram運用の目標
  - `snsAISettings.instagram.motivation` - 運用動機

#### プロンプトビルダー

**ファイル**: `src/utils/aiPromptBuilder.ts` (154-215行目)

```typescript
export const buildFeedPrompt = (
  userProfile: UserProfile,
  snsType: string
): string => {
  // フィード投稿生成用のプロンプトを構築
  // - 商品・サービス情報を自然に織り込む指示
  // - ターゲット市場に響く表現
  // - 課題解決のヒントを含める
  // - ブランド一貫性（キャッチコピー）を体現
}
```

---

### 4. リール投稿ラボ (`/instagram/lab/reel`)

**ファイル**: `src/app/instagram/lab/reel/page.tsx`

#### 参照内容

- **`useBusinessInfo()`** フックを使用してビジネス情報を取得
  - 使用箇所: 投稿生成時のAIプロンプト構築

#### AI生成での参照

**API**: `src/app/api/ai/post-generation/route.ts`

- **`buildReelPrompt()`** 関数を使用してAIプロンプトを生成
- 参照されるonboardingデータ:
  - `businessInfo.industry` - 業種
  - `businessInfo.productsOrServices` - 商品・サービス情報（ヒントとして活用）
  - `businessInfo.targetMarket` - ターゲット市場
  - `businessInfo.challenges` - 課題
  - `snsAISettings.instagram.tone` - トーン
  - `snsAISettings.instagram.manner` - マナー・ルール
  - `snsAISettings.instagram.cautions` - 注意事項・NGワード

#### プロンプトビルダー

**ファイル**: `src/utils/aiPromptBuilder.ts` (221-277行目)

```typescript
export const buildReelPrompt = (
  userProfile: UserProfile,
  snsType: string
): string => {
  // リール投稿生成用のプロンプトを構築
  // - 短くてインパクトのある表現
  // - 商品情報は「ヒント」として活用
  // - エンゲージメント重視
}
```

---

### 5. ストーリー投稿ラボ (`/instagram/lab/story`)

**ファイル**: `src/app/instagram/lab/story/page.tsx`

#### 参照内容

- **`useBusinessInfo()`** フックを使用してビジネス情報を取得
  - 使用箇所: 投稿生成時のAIプロンプト構築

#### AI生成での参照

**API**: `src/app/api/ai/post-generation/route.ts`

- **`buildStoryPrompt()`** 関数を使用してAIプロンプトを生成
- 参照されるonboardingデータ:
  - `businessInfo.industry` - 業種
  - `businessInfo.productsOrServices` - 商品・サービス情報（背景として活用）
  - `snsAISettings.instagram.tone` - トーン
  - `snsAISettings.instagram.manner` - マナー・ルール
  - `snsAISettings.instagram.cautions` - 注意事項・NGワード

#### プロンプトビルダー

**ファイル**: `src/utils/aiPromptBuilder.ts` (283-339行目)

```typescript
export const buildStoryPrompt = (
  userProfile: UserProfile,
  snsType: string
): string => {
  // ストーリーズ投稿生成用のプロンプトを構築
  // - 短さ（20-50文字）
  // - 日常感、親しみやすさ
  // - 商品情報は「背景」として活用
}
```

---

### 6. 投稿一覧 (`/instagram/posts`)

**ファイル**: `src/app/instagram/posts/page.tsx`

#### 参照内容

- **`useUserProfile()`** フックを使用
  - 使用箇所: アクセス制御（`canAccessFeature`）

#### 参照方法

```typescript
const { userProfile } = useUserProfile();
```

#### 備考

- 直接的なonboardingデータの参照は少ない
- 主にアクセス制御に使用

---

### 7. 月次レポート (`/instagram/report`)

**ファイル**: `src/app/instagram/report/page.tsx`

#### 参照内容

- 直接的なonboardingデータの参照は少ない
- API経由でAI生成時に参照される

#### AI生成での参照

**API**: `src/app/api/analytics/monthly-review/route.ts`

- **`buildReportPrompt()`** 関数を使用してAIプロンプトを生成
- 参照されるonboardingデータ:
  - `businessInfo.goals` - ビジネス目標（レポート生成時に意識）
  - `businessInfo.challenges` - 課題（改善提案に含める）

#### プロンプトビルダー

**ファイル**: `src/utils/aiPromptBuilder.ts` (584-665行目)

```typescript
export const buildReportPrompt = (
  userProfile: UserProfile,
  snsType: string,
  monthlyData?: {...},
  planSummary?: string,
  recentPosts?: Array<{...}>,
  improvements?: string[]
): string => {
  // 月次レポート生成用のプロンプトを構築
  // - クライアントの目標を意識
  // - 課題の解決を含める
}
```

---

### 8. KPIコンソール (`/instagram/kpi`)

**ファイル**: `src/app/instagram/kpi/page.tsx`

#### 参照内容

- **`useUserProfile()`** フックを使用
  - 使用箇所: アクセス制御（`canAccessFeature`）

#### 参照方法

```typescript
const { userProfile, loading: profileLoading } = useUserProfile();
```

#### 備考

- 直接的なonboardingデータの参照は少ない
- 主にアクセス制御に使用

---

### 9. 学習ダッシュボード (`/learning`)

**ファイル**: `src/app/learning/page.tsx`

#### 参照内容

- 直接的なonboardingデータの参照は少ない
- API経由でAI生成時に参照される可能性がある

#### 備考

- 学習データの表示が主な機能
- onboardingデータの直接参照は確認されていない

---

### 10. マイアカウント (`/onboarding`)

**ファイル**: `src/app/onboarding/page.tsx`

#### 参照内容

- **`userProfile.businessInfo`**: ビジネス情報の表示・編集
- **`userProfile.snsAISettings`**: SNS AI設定の表示・編集
- **`userProfile.name`**: ユーザー名の表示
- **`userProfile.email`**: メールアドレスの表示
- **`userProfile.status`**: ステータスの表示
- **`userProfile.contractType`**: 契約タイプの表示
- **`userProfile.contractSNS`**: 契約SNSの表示

#### 参照方法

```typescript
const { userProfile } = useUserProfile();
const businessInfo = userProfile?.businessInfo || {};
const snsAISettings = userProfile?.snsAISettings || {};
```

#### 備考

- onboardingページ自体がonboardingデータの表示・編集を行うページ
- 他のページで使用されるデータの入力元

---

## AI生成でのOnboarding参照（共通）

### プロンプトビルダー関数

**ファイル**: `src/utils/aiPromptBuilder.ts`

すべてのAI生成エンドポイントで、以下の関数を通じてonboardingデータが参照されます：

1. **`buildSystemPrompt()`** (7-117行目)
   - 基本的なビジネス情報とSNS AI設定を含むシステムプロンプトを構築
   - 全AI生成のベースとなる

2. **`buildFeedPrompt()`** (154-215行目)
   - フィード投稿生成用
   - 商品・サービス情報を自然に織り込む指示を含む

3. **`buildReelPrompt()`** (221-277行目)
   - リール投稿生成用
   - 短くてインパクトのある表現を重視

4. **`buildStoryPrompt()`** (283-339行目)
   - ストーリーズ投稿生成用
   - 短さと日常感を重視

5. **`buildPlanPrompt()`** (386-578行目)
   - 運用計画生成用
   - onboardingデータを詳細に参照

6. **`buildAnalysisPrompt()`** (344-356行目)
   - 分析・診断用
   - 目標達成度の評価に使用

7. **`buildReportPrompt()`** (584-665行目)
   - 月次レポート生成用
   - 目標と課題を意識したレポート生成

### 参照されるOnboardingデータの詳細

#### ビジネス情報 (`businessInfo`)

| 項目 | 使用箇所 | 用途 |
|------|---------|------|
| `industry` | 全AI生成 | 業種に適した内容生成 |
| `companySize` | 全AI生成 | 企業規模に適した表現 |
| `businessType` | 全AI生成 | BtoB/BtoCに適したアプローチ |
| `targetMarket` | 全AI生成 | ターゲット層に響く表現 |
| `catchphrase` | フィード、計画 | ブランド一貫性の維持 |
| `description` | 全AI生成 | 事業内容の理解 |
| `initialFollowers` | 運用計画 | 初期値として使用 |
| `goals` | 全AI生成 | 目標達成に向けた提案 |
| `challenges` | 全AI生成 | 課題解決のアプローチ |
| `productsOrServices` | フィード、リール、ストーリー | 投稿内容に自然に織り込む |

#### SNS AI設定 (`snsAISettings.instagram`)

| 項目 | 使用箇所 | 用途 |
|------|---------|------|
| `tone` | 全AI生成 | トーンの統一 |
| `manner` | 全AI生成 | マナー・ルールの遵守 |
| `cautions` | 全AI生成 | NGワードの回避 |
| `goals` | 運用計画 | Instagram運用の目標 |
| `motivation` | 全AI生成 | 運用動機の反映 |
| `features` | 全AI生成 | 有効機能の考慮 |
| `additionalInfo` | 全AI生成 | その他参考情報の活用 |

---

## APIエンドポイントでの参照

### 1. 投稿生成 API

**ファイル**: `src/app/api/ai/post-generation/route.ts`

- **`buildFeedPrompt()`**, **`buildReelPrompt()`**, **`buildStoryPrompt()`** を使用
- onboardingデータをAIプロンプトに組み込んで投稿を生成

### 2. 運用計画生成 API

**ファイル**: `src/app/api/instagram/ai-strategy/route.ts`  
**ファイル**: `src/app/api/instagram/simulation/route.ts`

- **`buildPlanPrompt()`** を使用
- onboardingデータを詳細に参照して運用計画を生成

### 3. AI診断 API

**ファイル**: `src/app/api/instagram/ai-diagnosis/route.ts`

- **`buildAnalysisPrompt()`** を使用
- onboardingデータを参照して分析・診断を実行

### 4. 月次レポート生成 API

**ファイル**: `src/app/api/analytics/monthly-review/route.ts`

- **`buildReportPrompt()`** を使用
- onboardingデータを参照して月次レポートを生成

### 5. 投稿インサイト API

**ファイル**: `src/app/api/ai/post-insight/route.ts`

- **`businessInfo`** を直接参照
- フォロワー数の取得などに使用

### 6. 月次分析 API

**ファイル**: `src/app/api/ai/monthly-analysis/services/analysis-service.ts`

- **`businessInfo`** を参照
- 分析プロンプトに組み込む

---

## まとめ

### Onboardingデータが最も活用されるページ

1. **運用計画** (`/instagram/plan`)
   - 初期フォロワー数の取得
   - AI生成時に全onboardingデータを参照

2. **投稿ラボ** (`/instagram/lab/feed`, `/instagram/lab/reel`, `/instagram/lab/story`)
   - AI生成時に全onboardingデータを参照
   - 特に商品・サービス情報、AI設定が重要

3. **月次レポート** (`/instagram/report`)
   - AI生成時に目標と課題を参照

### Onboardingデータの参照方法

1. **直接参照**: `useUserProfile()` フックを使用
2. **AI生成経由**: `aiPromptBuilder.ts` の各種関数を通じてAIプロンプトに組み込む

### 重要なポイント

- onboardingデータは主に**AI生成**で活用される
- 特に**ビジネス情報**と**SNS AI設定**が重要
- 各投稿タイプ（フィード、リール、ストーリー）で異なる活用方法
- 運用計画生成時には最も詳細に参照される

