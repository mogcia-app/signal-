# AIフロー分析と改善提案

作成日: 2026-01-30

## 概要

デモストレーション中に気づいた問題点を整理し、現状の実装状況を確認して、改善案をまとめました。

---

## 理想的なフロー

### 1. 基盤構築
- `/onboarding`でビジネス情報とAI設定を登録
- これがAIの基盤になる

### 2. 運用計画の作成
- `/instagram/plan`で1ヶ月単位で運用計画を立てる
- 計画は`/onboarding`の情報を基に生成される

### 3. 日々の運用（`/home`）
- ログインした瞬間に、今日の投稿文とハッシュタグがAIで準備されている
- 今月の目標・今週の予定・今日やること・明日の準備をAIが自動提案
- 運用計画に沿って生成される

### 4. 投稿の編集（`/instagram/lab`）
- 気に入らなかったら、ラボで編集可能
- AIが課題に沿って提案してくれる

### 5. 投稿の分析
- 投稿一覧から投稿データを分析ページでコピペ
- 簡易的にAIがその投稿の分析アドバイスを生成

### 6. 月次レポート（`/instagram/report`）
- 1ヶ月後、今月の振り返りレポートをAIが生成
- **次に何をすれば良いか？**まで提案

### 7. 来月の最適化
- 来月は「次に何をしたらいいか？」の内容に沿ってAIが最適化
- `/home`で投稿文を用意してくれる
- `/instagram/lab`でAIが課題に沿って提案してくれる

---

## 現状の実装状況

### ✅ 実装されている機能

#### 1. `/onboarding`の情報がAIの基盤になる
- **実装状況**: ✅ 実装済み
- **実装箇所**: `src/utils/aiPromptBuilder.ts`
  - `buildSystemPrompt()`で`businessInfo`と`snsAISettings`を参照
  - すべてのAI生成で使用される

#### 2. `/instagram/plan`で運用計画を立てる
- **実装状況**: ✅ 実装済み
- **実装箇所**: `src/app/instagram/plan/page.tsx`
  - `buildPlanPrompt()`で`/onboarding`の情報を参照して計画を生成

#### 3. `/home`で今日の投稿文とハッシュタグを自動生成
- **実装状況**: ✅ 実装済み
- **実装箇所**: `src/app/api/home/ai-generated-sections/route.ts`
  - 運用計画を参照して今日のタスクを生成
  - 投稿文とハッシュタグを自動生成
  - **問題点**: 月次レポートの「次に何をすれば良いか？」を参照していない

#### 4. `/instagram/lab`で編集可能
- **実装状況**: ✅ 実装済み
- **実装箇所**: `src/app/instagram/lab/feed/page.tsx`など
  - 投稿を編集可能
  - **問題点**: 月次レポートの課題を参照して提案していない

#### 5. 投稿の分析アドバイス
- **実装状況**: ✅ 実装済み
- **実装箇所**: `src/app/api/ai/post-insight/route.ts`
  - 投稿データを分析してアドバイスを生成
  - **問題点**: 月次レポートの「次に何をすれば良いか？」と一貫性がない

#### 6. 月次レポートで振り返りと提案
- **実装状況**: ✅ 実装済み
- **実装箇所**: `src/app/api/analytics/report-complete/route.ts`
  - `buildReportPrompt()`で振り返りと来月のアクションプランを生成
  - `buildNextMonthFocusActions()`で来月のフォーカスアクションを生成
  - **問題点**: 生成された提案が他のページで参照されていない

---

## 課題の本質

### 核心的な問題

**「AIは賢い。でも"意思"がないように見える」**

技術的にはかなり揃っているのに、以下の3つが同じ人格・同じ方針で話していない：

- 月次で「こうしよう」と言う
- 日次で「今日はこれやろう」と言う
- 投稿分析で「次はこれだね」と言う

**ユーザー視点での混乱**:
- 「え、先月"教育投稿増やせ"って言ってなかった？」
- 「今日の投稿、先月の反省どこいった？」

### 課題の本質

**「参照漏れ」ではなく、「意思決定の中心が存在しない」こと**

現在の構造では、意思決定が分散している：
- Planが方針を決める
- Monthly Reviewが方針を決める
- Insightも次を決める

→ **統一された「意思」がない**

---

## 問題点の詳細分析

### 問題1: 月次レポートの「次に何をすれば良いか？」が他のページで参照されていない

#### 現状

1. **月次レポートで生成される提案**
   - `buildReportPrompt()`で「来月の重点アクション」を生成
   - `buildNextMonthFocusActions()`で来月のフォーカスアクションを生成
   - `monthly_reviews`コレクションに保存される

2. **`/home`での投稿生成**
   - `ai-generated-sections`で今日のタスクを生成
   - 運用計画（`plans`コレクション）を参照
   - **月次レポートの提案を参照していない**

3. **`/instagram/lab`での投稿生成**
   - `buildAIContext()`でスナップショットやアクションログを参照
   - **月次レポートの提案を参照していない**

#### 影響

- 月次レポートで「次に何をすれば良いか？」を提案しても、それが実際の投稿生成に反映されない
- ユーザーは「来月はそれに沿ってAIが最適化してくれる」と期待するが、実際には反映されていない

---

### 問題2: 投稿分析アドバイスと月次レポートの一貫性がない

#### 現状

1. **投稿分析アドバイス** (`/api/ai/post-insight`)
   - 個別の投稿を分析
   - 強み・改善点・次のアクションを提案
   - マスターコンテキストを参照

2. **月次レポート** (`/api/analytics/report-complete`)
   - 月全体を振り返り
   - 来月のアクションプランを提案
   - マスターコンテキストを参照

3. **一貫性の問題**
   - 投稿分析で「次は〇〇をすべき」と提案しても、月次レポートでは別の提案になる可能性がある
   - 月次レポートで「来月は〇〇をすべき」と提案しても、投稿分析では別の提案になる可能性がある

#### 影響

- ユーザーが混乱する
- AIの提案に一貫性がないと感じる
- 信頼性が低下する

---

### 問題3: `/onboarding`の情報が十分に活用されていない

#### 現状

1. **`buildSystemPrompt()`での参照**
   - `businessInfo`と`snsAISettings`を参照
   - すべてのAI生成で使用される

2. **月次レポートの提案**
   - `buildReportPrompt()`で`businessInfo`を参照
   - しかし、プロンプトに「必ずビジネス情報を参照してください」という指示があるが、実際に十分に活用されているかは不明

3. **`/home`での投稿生成**
   - 運用計画を参照
   - 運用計画は`/onboarding`の情報を基に生成される
   - しかし、直接`/onboarding`の情報を参照していない

#### 影響

- 月次レポートの提案が凡庸になる可能性がある
- ビジネスに特化した提案にならない可能性がある

---

### 問題4: 「次に何をすれば良いか？」の正確性

#### 現状

1. **月次レポートでの提案**
   - `buildReportPrompt()`で「来月の重点アクション」を生成
   - `buildNextMonthFocusActions()`で来月のフォーカスアクションを生成
   - データに基づいて生成される

2. **提案の保存**
   - `monthly_reviews`コレクションに保存される
   - しかし、他のページで参照されていない

3. **提案の活用**
   - 保存はされているが、実際に活用されていない
   - ユーザーは「来月はそれに沿ってAIが最適化してくれる」と期待するが、実際には反映されていない

#### 影響

- 提案が正確でも、活用されなければ意味がない
- ユーザーの期待と実装にギャップがある

---

## 改善提案（既存）

### 改善1: 月次レポートの提案を`/home`と`/instagram/lab`で参照する

**評価**: ✅ **完全に正解**

月次レポートは「命令書」として機能すべき。以下のヒエラルキーが明確になる：

```
Onboarding（人格）
    ↓
Plan（月の設計）
    ↓
Monthly Review（修正命令）
    ↓
Home / Lab / Insight（実行部隊）
```

「レポートが保存されてるのに使われてない」という気づきは、プロダクト目線として鋭い。

#### 実装方法

1. **`/home`での投稿生成時に月次レポートの提案を参照**
   - `ai-generated-sections`で月次レポートの最新の提案を取得
   - 運用計画と月次レポートの提案の両方を参照して投稿を生成

2. **`/instagram/lab`での投稿生成時に月次レポートの提案を参照**
   - `buildAIContext()`で月次レポートの最新の提案を取得
   - スナップショット、アクションログ、月次レポートの提案を参照して投稿を生成

#### コード実装例

```typescript
// src/lib/ai/context.ts に追加
async function fetchLatestMonthlyReview(userId: string): Promise<{
  actionPlans?: Array<{
    title: string;
    description: string;
    recommendedActions: string[];
  }>;
  nextMonthFocusActions?: Array<{
    title: string;
    focusKPI: string;
    recommendedAction: string;
  }>;
} | null> {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    
    const reviewDoc = await adminDb
      .collection("monthly_reviews")
      .doc(`${userId}_${monthStr}`)
      .get();
    
    if (!reviewDoc.exists) {
      return null;
    }
    
    const data = reviewDoc.data();
    return {
      actionPlans: data?.actionPlans || [],
      nextMonthFocusActions: data?.nextMonthFocusActions || [],
    };
  } catch (error) {
    console.warn("⚠️ 月次レポート取得エラー:", error);
    return null;
  }
}

// buildAIContext() に追加
const monthlyReview = await fetchLatestMonthlyReview(userId);
if (monthlyReview) {
  // 月次レポートの提案をAIリファレンスに追加
  monthlyReview.actionPlans?.forEach((plan) => {
    references.push({
      id: `monthly-review-${plan.title}`,
      sourceType: "analytics",
      label: `来月の重点: ${plan.title}`,
      summary: plan.description,
      metadata: {
        type: "monthlyReview",
        recommendedActions: plan.recommendedActions,
      },
    });
  });
}
```

#### プロンプトへの組み込み

```typescript
// src/app/api/home/ai-generated-sections/route.ts
if (monthlyReview?.actionPlans && monthlyReview.actionPlans.length > 0) {
  systemPrompt += `

【来月の重点アクション（月次レポートから）】
${monthlyReview.actionPlans.map((plan) => 
  `- ${plan.title}: ${plan.description}\n  → ${plan.recommendedActions.join(", ")}`
).join("\n")}

上記の来月の重点アクションを意識して、今日の投稿を生成してください。`;
}
```

---

### 改善2: 投稿分析アドバイスと月次レポートの一貫性を保つ

#### 実装方法

1. **共通のマスターコンテキストを参照**
   - 投稿分析と月次レポートの両方で、同じマスターコンテキストを参照
   - 月次レポートの提案を投稿分析のプロンプトに組み込む

2. **月次レポートの提案を投稿分析に反映**
   - 投稿分析のプロンプトに「来月の重点アクション」を追加
   - 投稿分析の「次のアクション」が月次レポートの提案と一貫性を持つようにする

#### コード実装例

```typescript
// src/app/api/ai/post-insight/route.ts
const monthlyReview = await fetchLatestMonthlyReview(userId);
if (monthlyReview?.actionPlans && monthlyReview.actionPlans.length > 0) {
  prompt += `

【来月の重点アクション（月次レポートから）】
${monthlyReview.actionPlans.map((plan) => 
  `- ${plan.title}: ${plan.description}`
).join("\n")}

上記の来月の重点アクションを意識して、この投稿の「次のアクション」を提案してください。
月次レポートの提案と一貫性を持たせてください。`;
}
```

---

### 改善3: `/onboarding`の情報をより積極的に活用する

**評価**: ✅ **合っているが、役割分担が必要**

「全部毎回入れる」より、役割を決めるのが次の段階：

- **Onboarding** = 変わらない前提（人格、NGワード、基本方針）
- **Monthly Review** = 今月だけの戦略修正
- **Plan** = 量と配分
- **Post Insight** = 戦術ミスの検知

全部同列に入れると、LLM的には「重要度」がぼやける。

**推奨**: NGワードだけonboardingから引っ張ってくる（必須遵守事項として）

#### コード実装例

```typescript
// src/app/api/home/ai-generated-sections/route.ts
const userProfile = await getUserProfile(userId);
if (userProfile?.businessInfo) {
  const { productsOrServices, catchphrase, goals, challenges } = userProfile.businessInfo;
  
  systemPrompt += `

【ビジネス情報（直接参照）】
${catchphrase ? `キャッチコピー: ${catchphrase}` : ""}
${goals && goals.length > 0 ? `目標: ${goals.join(", ")}` : ""}
${challenges && challenges.length > 0 ? `課題: ${challenges.join(", ")}` : ""}
${productsOrServices && productsOrServices.length > 0 ? `
商品・サービス:
${productsOrServices.map((p) => `- ${p.name}${p.details ? `: ${p.details}` : ""}`).join("\n")}
` : ""}

上記のビジネス情報を必ず参照して、具体的な商品・サービス名を使用して投稿を生成してください。`;
}
```

---

### 改善4: 月次レポートの提案を確実に保存・参照する

#### 実装方法

1. **提案の保存を確実にする**
   - `monthly_reviews`コレクションに確実に保存
   - 保存エラーをログに記録

2. **提案の参照を確実にする**
   - `buildAIContext()`で月次レポートの最新の提案を取得
   - 取得エラーをログに記録

3. **提案の有効期限を設定**
   - 最新の月次レポートの提案のみを参照
   - 古い提案は参照しない

#### コード実装例

```typescript
// src/lib/ai/context.ts
async function fetchLatestMonthlyReview(userId: string): Promise<MonthlyReview | null> {
  try {
    // 最新の月次レポートを取得（過去3ヶ月以内）
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    
    const reviewsSnapshot = await adminDb
      .collection("monthly_reviews")
      .where("userId", "==", userId)
      .orderBy("month", "desc")
      .limit(1)
      .get();
    
    if (reviewsSnapshot.empty) {
      return null;
    }
    
    const reviewDoc = reviewsSnapshot.docs[0];
    const data = reviewDoc.data();
    const reviewMonth = new Date(data.month + "-01");
    
    // 3ヶ月以内のレポートのみを返す
    if (reviewMonth < threeMonthsAgo) {
      return null;
    }
    
    return {
      month: data.month,
      actionPlans: data?.actionPlans || [],
      nextMonthFocusActions: data?.nextMonthFocusActions || [],
    };
  } catch (error) {
    console.error("⚠️ 月次レポート取得エラー:", error);
    return null;
  }
}
```

---

## 拡張提案（次の段階）

### 🔥 拡張提案1: 「AIの意思」を1箇所に集約する（Decision Core）

#### 何が足りないか

現在は意思決定が分散している：
- Planが方針を決める
- Monthly Reviewが方針を決める
- Insightも次を決める

→ **統一された「意思」がない**

#### 解決策

**「今月のAI方針」ドキュメントを1つ作る**

**コレクション**: `ai_direction/{userId}/{yyyy-mm}`

**構造**:
```typescript
{
  userId: string;
  month: string; // "2026-01"
  mainTheme: string; // "教育価値の可視化"
  avoidFocus: string[]; // ["日常雑談のみの投稿"]
  priorityKPI: string; // "保存率"
  postingRules: string[]; // ["1投稿1メッセージ", "必ず専門性の一文を入れる"]
  generatedFrom: "monthly_review" | "plan" | "manual";
  lockedAt?: Timestamp; // ユーザーが確定した時刻
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 実装方法

1. **月次レポート生成時に`ai_direction`を作成**
   - 月次レポートの提案を`ai_direction`に変換
   - ユーザーが確認・確定したら`lockedAt`を設定

2. **すべてのAI生成で`ai_direction`を最初に読む**
   - `/home`での投稿生成
   - `/instagram/lab`での投稿生成
   - `/api/ai/post-insight`での分析アドバイス

3. **優先順位の明確化**
   ```
   ai_direction（今月の方針） ← 最優先
       ↓
   onboarding（NGワードなど必須遵守事項）
       ↓
   plan（量と配分）
       ↓
   その他のコンテキスト
   ```

#### 期待される効果

- **全部のAIが同じ編集長の指示で動いている**状態になる
- ユーザーが「AIが考えている道筋」を理解できる
- 月次の方針が一貫して実行される

---

### 🔥 拡張提案2: 月次レポートを「読むもの」から「ロックするもの」へ

#### 現状の問題

月次レポートは：
```
提案 → 保存 → 参照（予定）
```

しかし、ユーザーが「確定」したかどうかが不明確。

#### 解決策

**ユーザー確認ステップを入れる**

**フロー**:
1. 月次レポート生成
2. **「今月の重点方針はこれで進めますか？」** → ✅ Yes / ✏ 修正
3. Yesされた瞬間に`ai_direction`として確定（`lockedAt`を設定）
4. その月はブレない

#### 実装方法

```typescript
// 月次レポート生成後
const monthlyReview = await generateMonthlyReview(...);

// ai_directionを作成（未確定状態）
await adminDb.collection("ai_direction").doc(`${userId}_${month}`).set({
  userId,
  month,
  mainTheme: monthlyReview.mainTheme,
  avoidFocus: monthlyReview.avoidFocus,
  priorityKPI: monthlyReview.priorityKPI,
  postingRules: monthlyReview.postingRules,
  generatedFrom: "monthly_review",
  lockedAt: null, // 未確定
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});

// ユーザーが確定したら
await adminDb.collection("ai_direction").doc(`${userId}_${month}`).update({
  lockedAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

#### 期待される効果

- **「AIに任せてる感」＋「自分で決めた感」両立**
- ユーザーが主体的に方針を決定できる
- 確定した方針は月内でブレない

---

### 🔥 拡張提案3: 投稿分析は「点」じゃなく「警告装置」にする

#### 現状の問題

現在の`/post-insight`は優秀だが：
- 単発で終わる
- 月次方針とズレても止めない

#### 解決策

**投稿分析で「今月の方針からズレています」を検知する**

**例**:
```
⚠️ 方針乖離の警告

今月の重点は「保存される教育投稿」ですが、
この投稿は共感型に寄りすぎています。

推奨アクション:
- 専門性の一文を追加
- 保存される価値を明確化
```

#### 実装方法

```typescript
// src/app/api/ai/post-insight/route.ts
const aiDirection = await fetchAIDirection(userId, currentMonth);

if (aiDirection && aiDirection.lockedAt) {
  prompt += `

【今月のAI方針（必須遵守）】
- メインテーマ: ${aiDirection.mainTheme}
- 避けるべき焦点: ${aiDirection.avoidFocus.join(", ")}
- 優先KPI: ${aiDirection.priorityKPI}
- 投稿ルール: ${aiDirection.postingRules.join(", ")}

**重要**: この投稿が上記の方針と一致しているか、乖離しているかを必ず評価してください。

出力形式に以下を追加:
{
  "summary": "...",
  "strengths": [...],
  "improvements": [...],
  "nextActions": [...],
  "directionAlignment": "一致" | "乖離" | "要注意",
  "directionComment": "方針との関係性を1文で説明"
}
`;
}
```

#### 期待される効果

- AIが「ブレーキ役」になる
- 月次方針からズレた投稿を早期に検知
- 一貫性のある運用が実現

---

### 🔥 拡張提案4: `/home`は「生成」と「司令塔（方針の説明）」の2つで機能する

#### 現状の問題

現在の`/home`は役割が多すぎる：
- 投稿文生成
- タスク生成
- KPI表示
- など

しかし、**「なぜこの投稿文が生成されたのか」が不明確**

#### 解決策

**`/home`の役割を2つの機能で再定義**

1. **投稿文生成（既存機能を維持）**
   - 今日の投稿文とハッシュタグを自動生成
   - 実用性を保つ

2. **司令塔機能（方針の説明を追加）**
   - **今月の方針（1行）** - `ai_direction`から取得
   - **今週のテーマ** - 運用計画から取得
   - **今日やる理由（なぜこれか）** - 方針との関連性を説明
   - **生成された投稿文が方針にどう沿っているか**を明示

**例**:
```
【今月の方針】
保育の専門性を言語化する月

【今週のテーマ】
遊びの意図を説明する

【今日の投稿】
「なぜこの遊びを選んだか」を説明する投稿です
→ 今月の方針「専門性の可視化」に沿っています

【生成された投稿文】
[実際の投稿文とハッシュタグが表示される]
```

#### 実装方法

```typescript
// src/app/api/home/ai-generated-sections/route.ts
const aiDirection = await fetchAIDirection(userId, currentMonth);

if (aiDirection && aiDirection.lockedAt) {
  // 今月の方針を表示
  monthlyGoals.push({
    title: "今月の重点方針",
    description: aiDirection.mainTheme,
    reason: `優先KPI: ${aiDirection.priorityKPI}`,
  });
  
  // 今日のタスク生成時に方針を参照
  systemPrompt += `

【今月のAI方針（必須遵守）】
- メインテーマ: ${aiDirection.mainTheme}
- 避けるべき焦点: ${aiDirection.avoidFocus.join(", ")}
- 投稿ルール: ${aiDirection.postingRules.join(", ")}

今日の投稿は、上記の方針に沿って生成してください。
各タスクに「なぜこれか（方針との関連性）」を説明してください。`;
}
```

#### 期待される効果

- **生成機能**: ユーザーは投稿文をすぐに使える（実用性を維持）
- **司令塔機能**: ユーザーが「AIが考えている道筋」を理解できる
- **両方の機能**: 投稿文が生成される理由が明確になり、ユーザーの理解が深まる
- `/home`が「生成」と「司令塔」の両方の機能を持つ

---

### 🔥 拡張提案5: NGワードはonboardingから必須遵守事項として参照

#### 実装方法

すべてのAI生成で、onboardingのNGワードを最優先で参照：

```typescript
// src/utils/aiPromptBuilder.ts
export const buildSystemPrompt = (userProfile: UserProfile, snsType?: string): string => {
  const { businessInfo, snsAISettings } = userProfile;
  
  // NGワードを最優先で表示
  let prompt = `【必須遵守事項（絶対に守る）】\n`;
  
  if (snsType && snsAISettings[snsType]) {
    const settings = snsAISettings[snsType] as {
      cautions?: string;
      manner?: string;
    };
    
    if (settings.cautions) {
      prompt += `❌ NGワード・注意事項（絶対に使用禁止）: ${settings.cautions}\n`;
    }
    if (settings.manner) {
      prompt += `✅ マナー・ルール（必ず遵守）: ${settings.manner}\n`;
    }
  }
  
  prompt += `\n【クライアント情報】\n`;
  // ... 既存のコード
};
```

#### 期待される効果

- NGワードが確実に回避される
- ユーザーが設定したルールが最優先で反映される

---

## 実装優先度

### 高優先度

1. **月次レポートの提案を`/home`と`/instagram/lab`で参照する**
   - ユーザーの期待と実装のギャップを解消
   - デモで説明した機能を実現

2. **投稿分析アドバイスと月次レポートの一貫性を保つ**
   - ユーザーの混乱を解消
   - AIの提案の信頼性を向上

### 中優先度

3. **`/onboarding`の情報をより積極的に活用する**
   - 月次レポートの提案の質を向上
   - ビジネスに特化した提案を実現

4. **月次レポートの提案を確実に保存・参照する**
   - データの整合性を保つ
   - エラーハンドリングを改善

---

## 総評

### 現状の評価

- **技術**: もう十分すごい ✅
- **課題認識**: かなりプロダクトオーナー視点 ✅
- **今足りないのは**: 「AIに人格と意思を一本通す設計」だけ

### 目指すべき姿

**「生成AIツール」ではなく「SNS運用OS」になる**

現在のSignal.は技術的には優秀だが、「意思」が分散している。

拡張提案を実装することで：
- AIに「人格と意思」が一本通る
- ユーザーが「AIが考えている道筋」を理解できる
- 月次方針が一貫して実行される
- 「AIに任せてる感」＋「自分で決めた感」が両立する

---

## まとめ

### 現状の問題点

1. **意思決定の中心が存在しない**
   - 月次レポートの「次に何をすれば良いか？」が他のページで参照されていない
   - 投稿分析アドバイスと月次レポートの一貫性がない
   - 「次に何をすれば良いか？」の提案が正確でも、活用されていない

2. **情報の役割分担が不明確**
   - `/onboarding`の情報が十分に活用されていない
   - すべての情報を同列に入れると、LLM的には「重要度」がぼやける

### 改善の方向性

#### 短期（既存の改善案）

1. **月次レポートの提案を`/home`と`/instagram/lab`で参照する**
   - 月次レポートを「命令書」として機能させる

2. **投稿分析アドバイスと月次レポートの一貫性を保つ**
   - 共通のマスターコンテキストを参照

3. **`/onboarding`の情報を役割分担して活用する**
   - NGワードは必須遵守事項として最優先
   - その他の情報は役割に応じて参照

#### 中期（拡張提案）

4. **「AIの意思」を1箇所に集約する（Decision Core）**
   - `ai_direction`コレクションを作成
   - すべてのAI生成で最初に読む

5. **月次レポートを「ロックするもの」へ**
   - ユーザー確認ステップを入れる
   - 確定した方針は月内でブレない

6. **投稿分析を「警告装置」にする**
   - 月次方針との一致/乖離を検知
   - AIが「ブレーキ役」になる

7. **`/home`を「司令塔」にする**
   - 投稿文生成ではなく、方針の説明に重点
   - ユーザーが「AIが考えている道筋」を理解できる

### 期待される効果

1. **AIに「人格と意思」が一本通る**
   - すべてのAIが同じ編集長の指示で動く

2. **ユーザーの期待と実装のギャップを解消**
   - デモで説明した機能を実現

3. **AIの提案の一貫性と信頼性を向上**
   - 月次方針が一貫して実行される

4. **ビジネスに特化した提案を実現**
   - NGワードなど必須遵守事項が確実に反映される

5. **「SNS運用OS」としての完成**
   - 「生成AIツール」から「運用OS」への進化

---

## 参考資料

- [Onboarding参照分析](./ONBOARDING_REFERENCE_ANALYSIS.md)
- [AI学習メカニズム](./AI_LEARNING_MECHANISM.md)
- [月次レポート詳細](../product/MONTHLY_REPORT_DETAILS.md)

