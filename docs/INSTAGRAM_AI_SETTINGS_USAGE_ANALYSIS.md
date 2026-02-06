# Instagram AI設定の使用状況分析

作成日: 2026-01-30

## 概要

`/onboarding`で設定されるInstagram AI設定（トーン、マナー・ルール、注意事項・NGワード、運用目標、活動の動機など）が、実際にどこで使われているか、使われていないかを分析しました。

---

## Instagram AI設定の内容

`/onboarding`で設定できる項目：

1. **トーン** (`tone`)
2. **マナー・ルール** (`manner`)
3. **注意事項・NGワード** (`cautions`)
4. **Instagram運用の目標** (`goals`)
5. **活動の動機** (`motivation`)
6. **その他AI参考情報** (`additionalInfo`)
7. **機能** (`features`)

---

## 使用状況の詳細

### ✅ 使われている箇所

#### 1. 投稿生成（`/instagram/lab`）

**ファイル**: `src/app/api/ai/post-generation/route.ts`

- **使用状況**: ✅ 使用されている
- **実装方法**: `buildFeedPrompt()`, `buildReelPrompt()`, `buildStoryPrompt()`を使用
- **参照箇所**: `buildSystemPrompt()` → `buildFeedPrompt()`など → Instagram AI設定を参照

**コード**:
```typescript
if (postType === "feed") {
  systemPrompt = buildFeedPrompt(userProfile, "instagram");
} else if (postType === "reel") {
  systemPrompt = buildReelPrompt(userProfile, "instagram");
} else if (postType === "story") {
  systemPrompt = buildStoryPrompt(userProfile, "instagram");
}
```

#### 2. `/home`での投稿文生成

**ファイル**: `src/app/api/home/ai-generated-sections/route.ts`

- **使用状況**: ✅ 使用されている
- **実装方法**: `buildPostGenerationPrompt()`を使用
- **参照箇所**: 525行目

**コード**:
```typescript
let systemPrompt = buildPostGenerationPrompt(userProfile, "instagram", postType);
```

#### 3. 運用計画生成

**ファイル**: `src/utils/aiPromptBuilder.ts` (`buildPlanPrompt()`)

- **使用状況**: ✅ 使用されている
- **実装方法**: `buildSystemPrompt()`を使用
- **参照箇所**: 470-491行目

**コード**:
```typescript
const settings = userProfile.snsAISettings[snsType] as {
  enabled: boolean;
  tone?: string;
  manner?: string;
  cautions?: string;
  goals?: string;
  motivation?: string;
  additionalInfo?: string;
};

if (settings.cautions) {
  prompt += `- ❌ NGワード/注意事項: ${settings.cautions}\n`;
}
if (settings.manner) {
  prompt += `- ✅ マナー/ルール: ${settings.manner}\n`;
}
if (settings.tone) {
  prompt += `- 💬 トーン: ${settings.tone}`;
}
```

#### 4. スケジュール生成（フィード/リール/ストーリー）

**ファイル**: 
- `src/app/api/instagram/feed-schedule/route.ts`
- `src/app/api/instagram/reel-schedule/route.ts`
- `src/app/api/instagram/story-schedule/route.ts`

- **使用状況**: ✅ 使用されている
- **実装方法**: `buildBusinessContext()`内で直接参照
- **参照箇所**: 220-237行目付近

**コード**:
```typescript
if (businessInfo.snsAISettings && businessInfo.snsAISettings.instagram) {
  const instagramSettings = businessInfo.snsAISettings.instagram as Record<string, unknown>;
  if (instagramSettings.tone) {
    context += `Instagramトーン: ${instagramSettings.tone}\n`;
  }
  if (instagramSettings.manner) {
    context += `Instagramマナー: ${instagramSettings.manner}\n`;
  }
  // ... その他の設定も参照
}
```

#### 5. 月次レポート生成

**ファイル**: 
- `src/app/api/analytics/report-complete/route.ts`
- `src/app/api/analytics/monthly-review-simple/route.ts`

- **使用状況**: ✅ 使用されている
- **実装方法**: プロンプトに直接組み込む
- **参照箇所**: 1080-1153行目付近

**コード**:
```typescript
const snsAISettings = userData?.snsAISettings?.instagram || {};
if (snsAISettings.tone) {
  aiSettingsParts.push(`トーン: ${snsAISettings.tone}`);
}
if (snsAISettings.manner) {
  aiSettingsParts.push(`マナー・ルール: ${snsAISettings.manner}`);
}
// ... その他の設定も参照
```

---

### ❌ 使われていない箇所

#### 1. 投稿分析アドバイス

**ファイル**: `src/app/api/ai/post-insight/route.ts`

- **使用状況**: ❌ 使われていない
- **問題点**: プロンプトを直接構築しており、`buildSystemPrompt()`を使用していない
- **影響**: Instagram AI設定（トーン、マナー、NGワードなど）が反映されない

**現状のコード** (286-311行目):
```typescript
const prompt = `以下のInstagram投稿データを分析し、JSON形式で出力してください。

【分析のポイント】
- 投稿内容・ハッシュタグ・投稿日時を確認
- 分析ページで入力された分析データ（いいね数、コメント数、リーチ数など）を評価
- フィードバック（満足度・メモ）を考慮
- 計画の目標フォロワー数・KPI・ターゲット層と比較
- 現在のフォロワー数と目標の差を考慮
- 事業内容・ターゲット市場を踏まえた提案

投稿データ:
${JSON.stringify(payload, null, 2)}`;
```

**改善案**: `buildSystemPrompt()`を使用してInstagram AI設定を参照する

```typescript
import { buildSystemPrompt } from "../../../../utils/aiPromptBuilder";

const systemPrompt = buildSystemPrompt(userProfile, "instagram");
const prompt = `${systemPrompt}

以下のInstagram投稿データを分析し、JSON形式で出力してください。
// ... 以下、既存のプロンプト
`;
```

#### 2. `/home`でのタスク生成（ヒント生成）

**ファイル**: `src/app/api/home/ai-generated-sections/route.ts`

- **使用状況**: ❌ 使われていない
- **問題点**: プロンプトを直接構築しており、`buildSystemPrompt()`を使用していない
- **影響**: Instagram AI設定（トーン、マナー、NGワードなど）が反映されない

**現状のコード** (693-726行目):
```typescript
const todayTasksPrompt = `以下の情報を基に、今日のタスクを実行する際の具体的なヒントを提案してください。

【計画の目標】
${mainGoal}

【ターゲット層】
${targetAudience || "未設定"}

【今週の戦略テーマ】
${strategyTheme || "未設定"}

【ビジネス情報】
${businessDescription ? `事業内容: ${businessDescription}` : ""}
${businessCatchphrase ? `キャッチフレーズ: ${businessCatchphrase}` : ""}

計画の目標「${mainGoal}」を達成するために、各タスクを実行する際の具体的で実用的なヒントを提案してください。`;
```

**改善案**: `buildSystemPrompt()`を使用してInstagram AI設定を参照する

```typescript
import { buildSystemPrompt } from "../../../../utils/aiPromptBuilder";

const systemPrompt = buildSystemPrompt(userProfile, "instagram");
const todayTasksPrompt = `${systemPrompt}

以下の情報を基に、今日のタスクを実行する際の具体的なヒントを提案してください。
// ... 以下、既存のプロンプト
`;
```

---

## まとめ

### 使用状況の一覧

| 機能 | ファイル | 使用状況 | 備考 |
|------|---------|---------|------|
| 投稿生成（ラボ） | `post-generation/route.ts` | ✅ 使用 | `buildFeedPrompt()`など使用 |
| `/home`投稿文生成 | `home/ai-generated-sections/route.ts` | ✅ 使用 | `buildPostGenerationPrompt()`使用 |
| 運用計画生成 | `aiPromptBuilder.ts` | ✅ 使用 | `buildPlanPrompt()`内で参照 |
| スケジュール生成 | `feed/reel/story-schedule/route.ts` | ✅ 使用 | 直接参照 |
| 月次レポート生成 | `report-complete/route.ts` | ✅ 使用 | 直接参照 |
| **投稿分析アドバイス** | `post-insight/route.ts` | ❌ **未使用** | プロンプト直接構築 |
| **`/home`タスク生成** | `home/ai-generated-sections/route.ts` | ❌ **未使用** | プロンプト直接構築 |

### 問題点

1. **投稿分析アドバイスでInstagram AI設定が使われていない**
   - ユーザーが設定したトーン、マナー、NGワードが反映されない
   - 分析アドバイスがユーザーの好みと合わない可能性がある

2. **`/home`でのタスク生成でInstagram AI設定が使われていない**
   - タスクのヒント生成時にInstagram AI設定が反映されない
   - ユーザーが設定したトーンやマナーが無視される

### 改善提案

#### 優先度: 高

1. **投稿分析アドバイスでInstagram AI設定を参照**
   - `buildSystemPrompt()`を使用
   - トーン、マナー、NGワードを反映した分析アドバイスを生成

2. **`/home`でのタスク生成でInstagram AI設定を参照**
   - `buildSystemPrompt()`を使用
   - タスクのヒント生成時にInstagram AI設定を反映

---

## 改善実装例

### 投稿分析アドバイスの改善

**ファイル**: `src/app/api/ai/post-insight/route.ts`

```typescript
import { buildSystemPrompt } from "../../../../utils/aiPromptBuilder";

export async function POST(request: NextRequest) {
  // ... 既存のコード ...

  // ✅ 改善: buildSystemPrompt()を使用
  const systemPrompt = buildSystemPrompt(userProfile, "instagram");
  
  const prompt = `${systemPrompt}

以下のInstagram投稿データを分析し、JSON形式で出力してください。

【分析のポイント】
- 投稿内容・ハッシュタグ・投稿日時を確認
- 分析ページで入力された分析データ（いいね数、コメント数、リーチ数など）を評価
- フィードバック（満足度・メモ）を考慮
- 計画の目標フォロワー数・KPI・ターゲット層と比較
- 現在のフォロワー数と目標の差を考慮
- 事業内容・ターゲット市場を踏まえた提案
- **重要**: 上記のInstagram AI設定（トーン、マナー、NGワード）を必ず考慮してください

出力形式:
{
  "summary": "投稿全体の一言まとめ（30-60文字程度）",
  "strengths": ["この投稿の良かった部分1", "この投稿の良かった部分2"],
  "improvements": ["改善すべきポイント1", "改善すべきポイント2"],
  "nextActions": ["次は何をすべきか？（次の一手）1", "次は何をすべきか？（次の一手）2"]
}

投稿データ:
${JSON.stringify(payload, null, 2)}`;

  // ✅ 改善: systemPromptを追加
  const rawResponse = await callOpenAIForPostInsight(prompt, systemPrompt);
  // ... 既存のコード ...
}

async function callOpenAIForPostInsight(prompt: string, systemPrompt?: string): Promise<string> {
  // ... 既存のコード ...
  
  const messages = [
    {
      role: "system",
      content: systemPrompt || `あなたはInstagram運用のエキスパートアナリストです。投稿データ、分析データ、フィードバック、計画情報、事業内容を総合的に分析し、この投稿の良かった部分、改善すべきポイント、次は何をすべきか（次の一手）を具体的に提案してください。出力はJSONのみ。`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];
  // ... 既存のコード ...
}
```

### `/home`でのタスク生成の改善

**ファイル**: `src/app/api/home/ai-generated-sections/route.ts`

```typescript
import { buildSystemPrompt } from "../../../../utils/aiPromptBuilder";

// ... 既存のコード ...

if (todayTasksFromPlan.length > 0 && openai && userProfile) {
  try {
    // ✅ 改善: buildSystemPrompt()を使用
    const systemPrompt = buildSystemPrompt(userProfile, "instagram");
    
    const todayTasksPrompt = `${systemPrompt}

以下の情報を基に、今日のタスクを実行する際の具体的なヒントを提案してください。

【計画の目標】
${mainGoal}

【ターゲット層】
${targetAudience || "未設定"}

【今週の戦略テーマ】
${strategyTheme || "未設定"}

【今週の戦略アクション】
${strategyActions.length > 0 ? strategyActions.map((a: string) => `- ${a}`).join("\n") : "未設定"}

【今日のタスク】
${todayTasksFromPlan.map((task, index: number) => 
  `${index + 1}. ${task.time} - ${task.type === "feed" ? "フィード投稿" : task.type === "reel" ? "リール" : "ストーリーズ"}: ${task.description}`
).join("\n")}

【ビジネス情報】
${businessDescription ? `事業内容: ${businessDescription}` : ""}
${businessCatchphrase ? `キャッチフレーズ: ${businessCatchphrase}` : ""}

**重要**: 上記のInstagram AI設定（トーン、マナー、NGワード）を必ず考慮して、各タスクのヒントを提案してください。

以下の形式でJSONを返してください:
{
  "tips": [
    {
      "taskIndex": 1,
      "tip": "計画達成のための具体的なヒント（1行で簡潔に）"
    }
  ]
}

計画の目標「${mainGoal}」を達成するために、各タスクを実行する際の具体的で実用的なヒントを提案してください。`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt, // ✅ 改善: buildSystemPrompt()の結果を使用
        },
        {
          role: "user",
          content: todayTasksPrompt,
        },
      ],
      // ... 既存のコード ...
    });
    // ... 既存のコード ...
  }
}
```

---

## 期待される効果

### 改善後の効果

1. **投稿分析アドバイスの質向上**
   - ユーザーが設定したトーンに沿ったアドバイス
   - NGワードを避けた改善提案
   - マナー・ルールに沿った提案

2. **`/home`でのタスク生成の質向上**
   - ユーザーが設定したトーンに沿ったヒント
   - マナー・ルールを考慮したタスク提案
   - NGワードを避けた提案

3. **一貫性の向上**
   - すべてのAI生成でInstagram AI設定が反映される
   - ユーザーの期待と実装のギャップを解消

---

## 参考資料

- [Onboarding参照分析](./ONBOARDING_REFERENCE_ANALYSIS.md)
- [AIフロー分析と改善提案](./AI_FLOW_ANALYSIS_AND_IMPROVEMENTS.md)

