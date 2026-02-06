import { UserProfile } from "../types/user";

/**
 * ユーザープロファイルからAI用のシステムプロンプトを構築
 * 全てのAIエンドポイントで使用する共通関数
 */
export const buildSystemPrompt = (userProfile: UserProfile, snsType?: string): string => {
  const { businessInfo, snsAISettings } = userProfile;

  // NGワードを最優先で表示
  let prompt = `【必須遵守事項（絶対に守る）】\n`;
  
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
    
    if (settings.cautions) {
      prompt += `❌ NGワード・注意事項（絶対に使用禁止）: ${settings.cautions}\n`;
    }
    if (settings.manner) {
      prompt += `✅ マナー・ルール（必ず遵守）: ${settings.manner}\n`;
    }
  } else {
    // snsTypeが指定されていない場合、全SNSのNGワードを確認
    const enabledSNS = Object.entries(snsAISettings).filter(([_, settings]) => settings.enabled);
    for (const [sns, settings] of enabledSNS) {
      const snsSettings = settings as {
        enabled: boolean;
        tone?: string;
        features?: string[];
        manner?: string;
        cautions?: string;
        goals?: string;
        motivation?: string;
        additionalInfo?: string;
      };
      if (snsSettings.cautions) {
        prompt += `❌ ${sns.toUpperCase()} NGワード・注意事項（絶対に使用禁止）: ${snsSettings.cautions}\n`;
      }
      if (snsSettings.manner) {
        prompt += `✅ ${sns.toUpperCase()} マナー・ルール（必ず遵守）: ${snsSettings.manner}\n`;
      }
    }
  }
  
  prompt += `\nあなたはSNS運用をサポートする専門AIアシスタントです。

【クライアント情報】
- 企業名/名前: ${userProfile.name}
- 業種: ${businessInfo.industry || "未設定"}
- 会社規模: ${businessInfo.companySize || "未設定"}
- 事業形態: ${businessInfo.businessType || "未設定"}
- ターゲット市場: ${businessInfo.targetMarket || "未設定"}
${businessInfo.catchphrase ? `- キャッチコピー: 「${businessInfo.catchphrase}」` : ""}
- 事業内容: ${businessInfo.description || "未設定"}

【商品・サービス情報】
${
  businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0
    ? businessInfo.productsOrServices
        .map((p) => {
          let productInfo = `- ${p.name}`;
          if (p.details) {
            productInfo += `: ${p.details}`;
          }
          if (p.price) {
            productInfo += ` [価格: ${p.price}円（税込）]`;
          }
          return productInfo;
        })
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

      // 拡張項目（NGワードとマナーは既に最優先セクションで表示済みなので、ここでは他の項目のみ）
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
 * 投稿生成用のシステムプロンプト（汎用版・後方互換性のため残す）
 * @deprecated 投稿タイプ別の関数（buildFeedPrompt, buildReelPrompt, buildStoryPrompt）を使用してください
 */
export const buildPostGenerationPrompt = (
  userProfile: UserProfile,
  snsType: string,
  postType?: string
): string => {
  // 投稿タイプ別の関数に委譲
  if (postType === "feed") {
    return buildFeedPrompt(userProfile, snsType);
  } else if (postType === "reel") {
    return buildReelPrompt(userProfile, snsType);
  } else if (postType === "story") {
    return buildStoryPrompt(userProfile, snsType);
  }

  // 未指定の場合は汎用版を返す
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
 * フィード投稿生成用のシステムプロンプト
 * 商品情報を自然に織り込み、魅力的なストーリーを構築
 */
export const buildFeedPrompt = (
  userProfile: UserProfile,
  snsType: string
): string => {
  const basePrompt = buildSystemPrompt(userProfile, snsType);
  const { businessInfo } = userProfile;

  // 商品情報を自然に組み込むための指示
  const productGuidance = businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0
    ? `
【商品・サービス情報の活かし方】
以下の商品・サービス情報を「参考資料」として活用してください。機械的に詰め込むのではなく、投稿のテーマやストーリーに自然に織り込んでください。

${businessInfo.productsOrServices.map((p) => {
  let productInfo = `- ${p.name}`;
  if (p.details) {
    productInfo += `: ${p.details}`;
  }
  if (p.price) {
    productInfo += ` [価格: ${p.price}円（税込）]`;
  }
  return productInfo;
}).join("\n")}

重要: 商品情報は「必ず含める」のではなく、「テーマに合う場合のみ自然に言及」してください。無理に詰め込むと不自然になります。
`
    : "";

  const feedInstructions = `
【フィード投稿生成の指示】
あなたは${businessInfo.industry || "ビジネス"}業界に精通したInstagramコンテンツクリエイターです。
フォロワーが「保存したくなる」「シェアしたくなる」魅力的なフィード投稿を生成してください。

## フィード投稿の特性
- **視覚的ストーリーテリング**: 画像と文章で物語を紡ぐ
- **価値提供**: 読者にとって有益な情報や気づきを含める
- **感情に訴える**: 共感や感動を生む表現を使う
- **行動喚起**: 自然な形でフォロワーの行動を促す

## 生成のポイント
1. **ストーリー性**: 商品・サービスを紹介する際は、その背景や体験談を織り交ぜる
2. **自然な言及**: 商品情報は「宣伝」ではなく「体験の共有」として表現する
3. **ターゲット視点**: ${businessInfo.targetMarket || "ターゲット市場"}の視点で「知りたい」「感じたい」ことを意識する
4. **課題解決**: ${businessInfo.challenges && businessInfo.challenges.length > 0 ? businessInfo.challenges.join(", ") : "課題"}を解決するヒントを自然に含める
5. **ブランド一貫性**: 「${businessInfo.catchphrase || "ブランドの価値観"}」を体現する表現を使う

## 避けるべき表現
- ❌ 商品情報の羅列（「〇〇は△△円です。□□も△△円です。」など）
- ❌ 硬い営業文句（「ぜひご利用ください」「お問い合わせください」など）
- ❌ 情報の詰め込み（すべての商品を1投稿で紹介するなど）

## 推奨する表現
- ✅ 体験談やストーリーから始める（「先日、お客様からこんなお声をいただきました...」）
- ✅ 疑問形で共感を呼ぶ（「こんな悩み、ありませんか？」）
- ✅ 具体的なシーンを描く（「朝の忙しい時間に...」）
- ✅ 感情を動かす表現（「嬉しかった」「気づいた」「変わった」など）

${productGuidance}
`;

  return basePrompt + feedInstructions;
};

/**
 * リール投稿生成用のシステムプロンプト
 * エンゲージメント重視、短くインパクトのある表現
 */
export const buildReelPrompt = (
  userProfile: UserProfile,
  snsType: string
): string => {
  const basePrompt = buildSystemPrompt(userProfile, snsType);
  const { businessInfo } = userProfile;

  const productGuidance = businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0
    ? `
【商品・サービス情報の活かし方】
リールは「見る・学ぶ・楽しむ」が目的です。商品情報は「ヒント」として活用し、動画のテーマや学びのポイントに自然に織り込んでください。

${businessInfo.productsOrServices.map((p) => {
  let productInfo = `- ${p.name}`;
  if (p.details) {
    productInfo += `: ${p.details}`;
  }
  return productInfo;
}).join("\n")}

重要: リールのテキストは「動画の補足」として機能します。商品名を直接言及するよりも、「こんな方法で解決できます」という形で自然に導いてください。
`
    : "";

  const reelInstructions = `
【リール投稿生成の指示】
あなたは${businessInfo.industry || "ビジネス"}業界のエキスパートとして、短くてインパクトのあるリール投稿文を生成してください。

## リール投稿の特性
- **短時間で伝える**: 最初の3秒で興味を引く
- **学びや気づき**: 「なるほど！」と思える情報を提供
- **エンゲージメント重視**: コメントやシェアを促す表現
- **動画の補完**: 動画の内容を補足し、理解を深める

## 生成のポイント
1. **フック**: 最初の一文で「これは見たい」と思わせる
2. **簡潔性**: 50-150文字で要点を伝える
3. **疑問形活用**: 「知ってましたか？」「こんな方法、試したことありますか？」など
4. **数値や具体例**: 「3つのポイント」「実際の事例」など、具体的な情報を含める
5. **行動喚起**: 「試してみてください」「感想を聞かせてください」など、自然な形で促す

## 避けるべき表現
- ❌ 長文の説明（リールは動画が主役）
- ❌ 商品の詳細な説明（動画で見せるべき内容）
- ❌ 硬い表現（「ご利用ください」「お問い合わせください」など）

## 推奨する表現
- ✅ 疑問形で始める（「〇〇って知ってますか？」「こんな悩み、ありませんか？」）
- ✅ 数値やリスト（「3つのポイント」「5分で分かる」など）
- ✅ 体験談（「実際に試してみたら...」）
- ✅ 共感を呼ぶ表現（「あるある」「これ分かる」など）

${productGuidance}
`;

  return basePrompt + reelInstructions;
};

/**
 * ストーリーズ投稿生成用のシステムプロンプト
 * 短く、親しみやすく、日常感を大切に
 */
export const buildStoryPrompt = (
  userProfile: UserProfile,
  snsType: string
): string => {
  const basePrompt = buildSystemPrompt(userProfile, snsType);
  const { businessInfo } = userProfile;

  const productGuidance = businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0
    ? `
【商品・サービス情報の活かし方】
ストーリーズは「日常の共有」が目的です。商品情報は「背景」として活用し、自然な会話のように表現してください。

${businessInfo.productsOrServices.map((p) => {
  let productInfo = `- ${p.name}`;
  if (p.details) {
    productInfo += `: ${p.details}`;
  }
  return productInfo;
}).join("\n")}

重要: ストーリーズは「今、何をしているか」を共有する場です。商品を直接紹介するよりも、「今日は〇〇を作っています」という形で自然に織り込んでください。
`
    : "";

  const storyInstructions = `
【ストーリーズ投稿生成の指示】
あなたは${businessInfo.industry || "ビジネス"}の運営者として、親しみやすく日常感のあるストーリーズ投稿文を生成してください。

## ストーリーズ投稿の特性
- **短さ**: 20-50文字、1-2行で完結
- **日常感**: 「今、何をしているか」を共有
- **親しみやすさ**: フォロワーとの距離感を縮める
- **リアルタイム感**: 「今」の瞬間を切り取る

## 生成のポイント
1. **一言で伝える**: 長い説明は不要、シンプルに
2. **今の気持ち**: 「嬉しい」「楽しい」「頑張ってる」など、感情を込める
3. **質問形式**: 「どう思いますか？」「どっちがいい？」など、反応を促す
4. **日常の共有**: 「今日は〇〇しています」「今、〇〇を作っています」など
5. **親しみやすさ**: カジュアルでフレンドリーな表現

## 避けるべき表現
- ❌ 長文の説明（ストーリーズは短さが命）
- ❌ 硬い表現（「ご利用ください」「お問い合わせください」など）
- ❌ 商品情報の羅列（「〇〇は△△円です」など）

## 推奨する表現
- ✅ 一言で伝える（「今日は〇〇しています！」「〇〇完成しました✨」）
- ✅ 質問形式（「どっちがいい？」「どう思いますか？」）
- ✅ 感情表現（「嬉しい！」「楽しい！」「頑張ってる！」）
- ✅ 日常の共有（「今、〇〇を作っています」「今日は〇〇の日」）

${productGuidance}
`;

  return basePrompt + storyInstructions;
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
    useBaseGoals?: boolean;
    useBaseChallenges?: boolean;
    monthlyGoals?: string;
    monthlyChallenges?: string;
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
- 業種: ${userProfile.businessInfo.industry || "未設定"}
- 会社規模: ${userProfile.businessInfo.companySize || "未設定"}
- ターゲット市場: ${userProfile.businessInfo.targetMarket || "未設定"}
${(() => {
  // 今月の目標があればそれを優先、なければ基本方針を使用
  const hasMonthlyGoals = formData?.monthlyGoals && !formData?.useBaseGoals;
  const hasMonthlyChallenges = formData?.monthlyChallenges && !formData?.useBaseChallenges;
  
  const goalsText = hasMonthlyGoals 
    ? formData.monthlyGoals 
    : (Array.isArray(userProfile.businessInfo.goals) ? userProfile.businessInfo.goals.join(", ") : (userProfile.businessInfo.goals || "未設定"));
  
  const challengesText = hasMonthlyChallenges 
    ? formData.monthlyChallenges 
    : (Array.isArray(userProfile.businessInfo.challenges) ? userProfile.businessInfo.challenges.join(", ") : (userProfile.businessInfo.challenges || "未設定"));
  
  const priorityNote = (hasMonthlyGoals || hasMonthlyChallenges) 
    ? `\n**重要**: 上記の「今月の目標」と「今月の課題」を最優先で考慮してください。基本方針は参考情報として扱い、今月の目標・課題に沿った運用計画を生成してください。`
    : "";
  
  return `- ${hasMonthlyGoals ? "今月の目標（最優先）" : "ビジネス目標（基本方針）"}: ${goalsText}
- ${hasMonthlyChallenges ? "今月の課題（最優先）" : "課題（基本方針）"}: ${challengesText}${priorityNote}`;
})()}
${userProfile.businessInfo.catchphrase ? `- キャッチコピー: ${userProfile.businessInfo.catchphrase}` : ""}
${userProfile.businessInfo.productsOrServices && userProfile.businessInfo.productsOrServices.length > 0 ? `- 商品・サービス: ${userProfile.businessInfo.productsOrServices.map((p) => {
  let productInfo = p.name;
  if (p.details) {
    productInfo += `（${p.details}）`;
  }
  if (p.price) {
    productInfo += ` [価格: ${p.price}円（税込）]`;
  }
  return productInfo;
}).join("、")}` : ""}

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
- 月次フォロワー目標: ${monthlyTarget}
- 達成可能性評価: ${feasibility}
- 週あたり投稿目安: フィード${feedPosts}件 / リール${reelPosts}件
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
**重要**: 2026年のInstagramアルゴリズム変更に対応し、**関係性設計型**の戦略を生成してください。
「拡散」よりも「安心感の積み上げ」、「投稿の点」よりも「投稿前後の流れ」を重視します。

### ① **全体運用戦略（AI提案）**（200文字以内）
**関係性を起点にした戦略**を提示してください：
- 「拡散」よりも「安心感の積み上げ」を重視する方針
- ストーリーズを主軸に、フィード/リールはその結果として伸びる構造
- リールは新規認知の入口として活用しつつ、ストーリーズで日常的な接点を増やす
- 投稿は単体で完結させず、投稿前後のストーリーズによる反応設計を含める
${userProfile.businessInfo.catchphrase ? `- 「${userProfile.businessInfo.catchphrase}」の活かし方` : ""}
※横文字不可、簡潔に、動詞で締める。ストーリーズ をリール/フィードより優先する順位を明確に。

### ② **投稿設計（AI設計）**（200文字以内）
**メイン投稿とストーリーズの基本構造**を提案：
- **メイン投稿（週1〜2回）**: リールまたはカルーセルで、考え方・雰囲気・安心感を伝える
- **ストーリーズ（ほぼ毎日）**: 投稿前後にアンケート・質問・補足を行い、フォロワーとの反応を蓄積
- **反応ベースの改善サイクル**: ストーリーズの反応をもとに、次の投稿テーマを調整
- カテゴリ（${categories}）の配分を考慮
※投稿は「点」ではなく「流れ」として設計する。反応 → 改善までAIが設計している感を出す。

### ③ **関係性ベースのカスタマージャーニー**（200文字以内）
**機能ベースではなく、関係性の流れ**を5段階で提示：

① 日常接触 → [ストーリーズで日々触れる]
② 反応 → [質問・投票・リアクションで小さな行動が生まれる]
③ 理解 → [フィード/カルーセルで考え方や価値観を知る]
④ 信頼 → [利用者様の声や日常投稿で安心感が積み上がる]
⑤ 行動 → [ストーリーズやプロフィール導線から問い合わせ]

※各段階でどの投稿タイプ（ストーリーズ/フィード/リール）を使うか明記。
※機能ベース（認知→フィード、興味→リールなど）ではなく、関係性の深まりを表現。

### ④ **注視すべき指標（AI推奨）**（150文字以内）
**フォロワー数より関係性指標**を重視：
- ✅ ストーリーズ閲覧率
- ✅ スタンプ反応率
- ✅ 投稿後24時間の初動反応
- ✅ プロフィールアクセス数
- ✅ DM・問い合わせ数
- ❌ フォロワー数やいいね数だけに依存しない理由
※横文字不可、箇条書きで。関係性指標を優先する理由を簡潔に。

## 🎯 成果物の要件
1. **絶対に4セクションのみ** - ①全体運用戦略、②投稿設計、③関係性ベースのカスタマージャーニー、④注視すべき指標の4つだけを生成してください。それ以外のセクション（⑤具体的な投稿タイトル、⑥ハッシュタグ戦略、⑦エンゲージメント向上施策、⑧分析・改善プランなど）は生成しないでください。

2. **簡潔に書く**: 各セクションは読みやすい長さに（1セクション150文字以内を目安）

3. **横文字を使わない**: 「エンゲージメント率」→「保存率・いいね率」、「メッセージング」→「届け方」など

4. **動詞で締める**: 「〜できる」「〜が分かる」「〜を目指す」など、行動が見える表現に

5. **箇条書きを活用**: 読みやすく、要点が一目で分かるように

6. **具体的な数値目標**: ストーリーズ閲覧率60%、スタンプ反応率30%など、関係性指標を重視した具体的な数値

7. **${userProfile.businessInfo.industry || ""}業界の特性を活かす**: 競合との差別化を意識

8. **課題解決**: 「${Array.isArray(userProfile.businessInfo.challenges) ? userProfile.businessInfo.challenges.join(", ") : (userProfile.businessInfo.challenges || "未設定")}」をどう克服するか明示

**重要**: 必ず4セクションのみ（①、②、③、④）を生成してください。それ以外のセクションは含めないでください。
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
