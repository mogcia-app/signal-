import { UserProfile } from "../types/user";

/**
 * ユーザープロファイルからAI用のシステムプロンプトを構築
 * 全てのAIエンドポイントで使用する共通関数
 */
export const buildSystemPrompt = (userProfile: UserProfile, snsType?: string): string => {
  const { businessInfo, snsAISettings } = userProfile;

  // 基本的なビジネス情報
  let prompt = `あなたはSNS運用をサポートする専門AIアシスタントです。

【クライアント情報】
- 企業名/名前: ${userProfile.name}
- 業種: ${businessInfo.industry || "未設定"}
- 会社規模: ${businessInfo.companySize || "未設定"}
- 事業形態: ${businessInfo.businessType || "未設定"}
- ターゲット市場: ${businessInfo.targetMarket || "未設定"}
${businessInfo.catchphrase ? `- キャッチコピー: 「${businessInfo.catchphrase}」` : ""}
- 事業内容: ${businessInfo.description || "未設定"}

【商品・サービス・政策】
${
  businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0
    ? businessInfo.productsOrServices
        .map((p) => `- ${p.name}${p.details ? `: ${p.details}` : ""}`)
        .join("\n")
    : "- 未設定"
}

【目標】
${
  businessInfo.goals && businessInfo.goals.length > 0
    ? businessInfo.goals.map((g) => `- ${g}`).join("\n")
    : "- 未設定"
}

【課題】
${
  businessInfo.challenges && businessInfo.challenges.length > 0
    ? businessInfo.challenges.map((c) => `- ${c}`).join("\n")
    : "- 未設定"
}
`;

  // SNS固有の設定（snsTypeが指定されている場合）
  if (snsType && snsAISettings[snsType]) {
    const settings = snsAISettings[snsType] as {
      enabled: boolean;
      tone?: string;
      features?: string[];
      manner?: string;
      cautions?: string;
      goals?: string;
      motivation?: string;
      additionalInfo?: string;
    };

    if (settings.enabled) {
      prompt += `
【${snsType.toUpperCase()} AI設定】
- トーン: ${settings.tone || "フレンドリー"}
- 有効機能: ${settings.features && settings.features.length > 0 ? settings.features.join(", ") : "なし"}
`;

      // 拡張項目
      if (settings.manner) {
        prompt += `- マナー・ルール: ${settings.manner}\n`;
      }
      if (settings.cautions) {
        prompt += `- 注意事項・NGワード: ${settings.cautions}\n`;
      }
      if (settings.goals) {
        prompt += `- ${snsType.toUpperCase()}運用の目標: ${settings.goals}\n`;
      }
      if (settings.motivation) {
        prompt += `- 運用動機: ${settings.motivation}\n`;
      }
      if (settings.additionalInfo) {
        prompt += `- その他参考情報: ${settings.additionalInfo}\n`;
      }
    }
  } else {
    // 全SNSの設定を含める
    const enabledSNS = Object.entries(snsAISettings).filter(([_, settings]) => settings.enabled);
    if (enabledSNS.length > 0) {
      prompt += "\n【SNS AI設定】\n";
      enabledSNS.forEach(([sns, settings]) => {
        prompt += `- ${sns.toUpperCase()}: トーン「${settings.tone || "フレンドリー"}」`;
        if (settings.features && settings.features.length > 0) {
          prompt += ` | 機能: ${settings.features.join(", ")}`;
        }
        prompt += "\n";
      });
    }
  }

  prompt += `
【重要な指示】
1. 上記のクライアント情報を常に考慮してください
2. 目標達成に向けた提案を行ってください
3. 課題を解決するアプローチを含めてください
4. 指定されたトーンとスタイルを維持してください
5. ターゲット市場に適した内容を生成してください
`;

  return prompt;
};

/**
 * 投稿生成用のシステムプロンプト
 * より詳細な指示を含む
 */
export const buildPostGenerationPrompt = (
  userProfile: UserProfile,
  snsType: string,
  postType?: string
): string => {
  const basePrompt = buildSystemPrompt(userProfile, snsType);

  const additionalInstructions = `
【投稿生成の指示】
- 投稿タイプ: ${postType || "未指定"}
- クライアントの目標を意識した内容にする
- ターゲット市場（${userProfile.businessInfo.targetMarket}）に響く表現を使う
- 課題（${userProfile.businessInfo.challenges.join(", ")}）を解決するヒントを含める
- エンゲージメントを高める要素を含める
`;

  return basePrompt + additionalInstructions;
};

/**
 * 分析・診断用のシステムプロンプト
 */
export const buildAnalysisPrompt = (userProfile: UserProfile, snsType: string): string => {
  const basePrompt = buildSystemPrompt(userProfile, snsType);

  const additionalInstructions = `
【分析の指示】
- クライアントの目標達成度を評価する
- 課題に対する改善提案を行う
- 業界（${userProfile.businessInfo.industry}）の標準と比較する
- ターゲット市場（${userProfile.businessInfo.targetMarket}）に適した戦略を提案する
`;

  return basePrompt + additionalInstructions;
};

/**
 * 時間提案用のシステムプロンプト
 */
export const buildTimeOptimizationPrompt = (
  userProfile: UserProfile,
  snsType: string,
  analyticsData?: unknown[]
): string => {
  const basePrompt = buildSystemPrompt(userProfile, snsType);

  const additionalInstructions = `
【投稿時間最適化の指示】
- ターゲット市場（${userProfile.businessInfo.targetMarket}）の行動パターンを考慮
- 業種（${userProfile.businessInfo.industry}）に適した投稿時間を提案
${
  analyticsData && analyticsData.length > 0
    ? `- 過去のデータ（${analyticsData.length}件）に基づいて分析`
    : "- 一般的なベストプラクティスに基づいて提案"
}
`;

  return basePrompt + additionalInstructions;
};

/**
 * 運用計画AI用のシステムプロンプト（Plan - PDCA の P）
 * プロンプトビルダーをベースに、運用計画生成に特化した指示を追加
 */
export const buildPlanPrompt = (
  userProfile: UserProfile,
  snsType: string,
  formData?: {
    currentFollowers?: number | string;
    targetFollowers?: number | string;
    planPeriod?: string;
    goalCategory?: string;
    targetAudience?: string;
    strategyValues?: string[];
    postCategories?: string[];
    brandConcept?: string;
    colorVisual?: string;
    tone?: string;
    aiHelpRequest?: string;
    pastLearnings?: string;
    feedFreq?: number | string;
    reelFreq?: number | string;
    storyFreq?: number | string;
    saveGoal?: number | string;
    likeGoal?: number | string;
    reachGoal?: number | string;
    referenceAccounts?: string;
    hashtagStrategy?: string;
    constraints?: string;
    freeMemo?: string;
  },
  simulationResult?: {
    monthlyTarget?: number | string;
    feasibilityLevel?: string;
    postsPerWeek?: { feed?: number; reel?: number };
  }
): string => {
  const basePrompt = buildSystemPrompt(userProfile, snsType);

  // 計画データの整形
  const currentFollowers = formData?.currentFollowers || "未設定";
  const targetFollowers = formData?.targetFollowers || "未設定";
  const planPeriod = formData?.planPeriod || "未設定";
  const strategies =
    Array.isArray(formData?.strategyValues) && formData.strategyValues.length > 0
      ? formData.strategyValues.join(", ")
      : "未設定";
  const categories =
    Array.isArray(formData?.postCategories) && formData.postCategories.length > 0
      ? formData.postCategories.join(", ")
      : "未設定";

  // シミュレーション結果の整形
  const monthlyTarget = simulationResult?.monthlyTarget || "N/A";
  const feasibility = simulationResult?.feasibilityLevel || "N/A";
  const feedPosts = simulationResult?.postsPerWeek?.feed || 0;
  const reelPosts = simulationResult?.postsPerWeek?.reel || 0;

  const planInstructions = `
【運用計画生成の指示】
あなたは${userProfile.businessInfo.industry}業界に精通したInstagram戦略コンサルタントです。
このクライアントのために、**簡潔で分かりやすく、すぐ実行できる**運用計画を作成してください。

## ⚠️ 絶対守る執筆ルール
1. **横文字を使わない**（エンゲージメント→保存/いいね、メッセージング→届け方）
2. **1セクション150文字以内**（長文禁止）
3. **箇条書き中心**（読みやすく）
4. **動詞で締める**（〜できる、〜が分かる、〜を目指す）
5. **抽象的な表現を避ける**（具体的に）

## 📊 /onboarding で登録済みの基本情報（常に参照）
- 業種: ${userProfile.businessInfo.industry}
- 会社規模: ${userProfile.businessInfo.companySize}
- ターゲット市場: ${userProfile.businessInfo.targetMarket}
- ビジネス目標: ${userProfile.businessInfo.goals.join(", ")}
- 課題: ${userProfile.businessInfo.challenges.join(", ")}
${userProfile.businessInfo.catchphrase ? `- キャッチコピー: ${userProfile.businessInfo.catchphrase}` : ""}
${userProfile.businessInfo.productsOrServices && userProfile.businessInfo.productsOrServices.length > 0 ? `- 商品・サービス: ${userProfile.businessInfo.productsOrServices.map((p) => `${p.name}${p.details ? `（${p.details}）` : ""}`).join("、")}` : ""}

## ⚠️ AI設定の制約条件（絶対遵守）
${
  userProfile.snsAISettings[snsType]
    ? (() => {
        const settings = userProfile.snsAISettings[snsType] as {
          enabled: boolean;
          tone?: string;
          features?: string[];
          manner?: string;
          cautions?: string;
          goals?: string;
          motivation?: string;
          additionalInfo?: string;
        };
        return (
          (settings.cautions ? `- ❌ NGワード/注意事項: ${settings.cautions}\n` : "") +
          (settings.manner ? `- ✅ マナー/ルール: ${settings.manner}\n` : "") +
          (settings.tone ? `- 💬 トーン: ${settings.tone}` : "")
        );
      })()
    : ""
}

## 🌟 今回の運用計画（ユーザーが星マークで指定した必須項目）
- 期間: ${planPeriod}
- 現在のフォロワー: ${currentFollowers} → 目標: ${targetFollowers}
- KPIカテゴリ: ${formData?.goalCategory || "未設定"}
- ターゲット層: ${formData?.targetAudience || "未設定"}
- 選択した施策: ${strategies}
- 投稿カテゴリ: ${categories}
${formData?.aiHelpRequest ? `- ❓ AIに相談したいこと: ${formData.aiHelpRequest}` : ""}
${formData?.pastLearnings ? `- 📝 前回の振り返り: ${formData.pastLearnings}` : ""}

## 📌 任意項目（記入されている場合のみ参照）
${formData?.feedFreq || formData?.reelFreq || formData?.storyFreq ? `- 投稿頻度: フィード${formData.feedFreq || 0}回、リール${formData.reelFreq || 0}回、ストーリー${formData.storyFreq || 0}回/週` : ""}
${formData?.saveGoal || formData?.likeGoal || formData?.reachGoal ? `- 目標数値: 保存${formData.saveGoal || 0}、いいね${formData.likeGoal || 0}、リーチ${formData.reachGoal || 0}` : ""}
${formData?.referenceAccounts ? `- 参考アカウント: ${formData.referenceAccounts}` : ""}
${formData?.hashtagStrategy ? `- ハッシュタグ戦略: ${formData.hashtagStrategy}` : ""}
${formData?.constraints ? `- 制約条件: ${formData.constraints}` : ""}
${formData?.freeMemo ? `- 補足メモ: ${formData.freeMemo}` : ""}

## 📋 生成する内容（4つのセクション）

### ① **全体の投稿戦略**（150文字以内）
**【差別化ポイント】**を簡潔に提示してください：
- フォローする理由（1行で）
- 届けたい層への届け方（3行以内、年齢層別に）
- 投稿の基本方針（週〇回、保存率〇%を目指すなど）
${userProfile.businessInfo.catchphrase ? `- 「${userProfile.businessInfo.catchphrase}」の活かし方` : ""}
※横文字不可、簡潔に、動詞で締める

### ② **投稿構成の方向性**（150文字以内）
**3つの投稿タイプの役割と割合**を提案：
- **フィード**: 何を発信するか（情報7割、宣伝3割など）
- **リール**: 何を狙うか（認知拡大、フォロワー獲得など）
- **ストーリー**: どう使うか（日常、質問箱、アンケートなど）
- カテゴリ（${categories}）の配分
※簡潔に、箇条書きで

### ③ **カスタマージャーニー（タイムライン形式）**（150文字以内）
**4段階の投稿戦略**を1行ずつ簡潔に：

① 認知段階 → [何で注意を引くか？投稿タイプも]
② 興味段階 → [何で関心を深めるか？投稿タイプも]
③ 検討段階 → [何で信頼を作るか？投稿タイプも]
④ 行動段階 → [どう行動に繋げるか？投稿タイプも]

※各1行、投稿タイプ（フィード/リール/ストーリー）を明記

### ④ **注意点・成功のコツ**（100文字以内）
**失敗と成功を簡潔に**：
- ❌ よくある失敗（1行）
- ✅ 目指す数値（保存率〇%、いいね率〇%など）
- 💡 成功のコツ（1行）
※横文字不可、箇条書きで

## 🎯 成果物の要件
1. **簡潔に書く**: 各セクションは読みやすい長さに（1セクション150文字以内を目安）
2. **横文字を使わない**: 「エンゲージメント率」→「保存率・いいね率」、「メッセージング」→「届け方」など
3. **動詞で締める**: 「〜できる」「〜が分かる」「〜を目指す」など、行動が見える表現に
4. **箇条書きを活用**: 読みやすく、要点が一目で分かるように
5. **具体的な数値目標**: 保存率3%、いいね率5%など、分かりやすい指標で
6. **${userProfile.businessInfo.industry}業界の特性を活かす**: 競合との差別化を意識
7. **課題解決**: 「${userProfile.businessInfo.challenges.join(", ")}」をどう克服するか明示
`;

  return basePrompt + planInstructions;
};

/**
 * 月次レポートAI用のシステムプロンプト（Act - PDCA の Act）
 * プロンプトビルダーをベースに、月次レポートと来月のアクションプラン生成に特化
 */
export const buildReportPrompt = (
  userProfile: UserProfile,
  snsType: string,
  monthlyData?: {
    currentScore?: number;
    previousScore?: number;
    performanceRating?: string;
    totalPosts?: number;
    totalEngagement?: number;
    avgEngagementRate?: number;
  },
  planSummary?: string,
  recentPosts?: Array<{ title: string; engagement?: number }>,
  improvements?: string[]
): string => {
  const basePrompt = buildSystemPrompt(userProfile, snsType);

  const currentScore = monthlyData?.currentScore || 0;
  const previousScore = monthlyData?.previousScore || 0;
  const scoreDiff = currentScore - previousScore;
  const rating = monthlyData?.performanceRating || "C";

  const reportInstructions = `
【月次レポート生成の指示（PDCA - Act）】
このクライアントのために、今月の振り返りと来月のアクションプランを作成してください。

## 今月のパフォーマンス
- アカウントスコア: ${currentScore}点（前月: ${previousScore}点、変動: ${scoreDiff > 0 ? "+" : ""}${scoreDiff}点）
- パフォーマンス評価: ${rating}
- 総投稿数: ${monthlyData?.totalPosts || 0}件

## 運用計画の参照（PDCA - Plan）
${planSummary || "運用計画データなし"}

## 最近の投稿（PDCA - Do）
${
  recentPosts && recentPosts.length > 0
    ? recentPosts
        .slice(0, 5)
        .map(
          (p, i) =>
            `${i + 1}. ${p.title}${p.engagement ? ` (エンゲージメント: ${p.engagement})` : ""}`
        )
        .join("\n")
    : "投稿データなし"
}

## 改善提案（PDCA - Check）
${
  improvements && improvements.length > 0
    ? improvements.map((imp, i) => `${i + 1}. ${imp}`).join("\n")
    : "改善提案データなし"
}

## 生成する内容（簡潔に）

以下の形式で月次レポートと来月のアクションプランを作成してください：

### 📊 今月の総括（3-4行）
- スコア変動と要因
- 良かった点（1つ）
- 改善点（1つ）

### 🎯 来月の重点アクション（3個）
各アクションを1行で簡潔に：
1. [具体的なアクション1] → 期待される効果
2. [具体的なアクション2] → 期待される効果
3. [具体的なアクション3] → 期待される効果

### 📈 フォロワー成長予測
今月のパフォーマンスと重点アクションを基に、来月の予想フォロワー数を具体的な数値で示してください。
例：「現在のフォロワー数 + 施策A・B・C実施で +5〜8人増加が見込めます」

## 重要事項
- クライアントの目標（${userProfile.businessInfo.goals.join(", ")}）を意識する
- 課題（${userProfile.businessInfo.challenges.join(", ")}）の解決を含める
- 実行可能で具体的な提案にする
- 前向きで励ましのトーンを維持する
`;

  return basePrompt + reportInstructions;
};
