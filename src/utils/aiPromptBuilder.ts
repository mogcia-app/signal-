import { UserProfile } from '../types/user';

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
- 業種: ${businessInfo.industry || '未設定'}
- 会社規模: ${businessInfo.companySize || '未設定'}
- 事業形態: ${businessInfo.businessType || '未設定'}
- ターゲット市場: ${businessInfo.targetMarket || '未設定'}
${businessInfo.catchphrase ? `- キャッチコピー: 「${businessInfo.catchphrase}」` : ''}
- 事業内容: ${businessInfo.description || '未設定'}

【商品・サービス・政策】
${businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0
  ? businessInfo.productsOrServices.map(p => `- ${p.name}${p.details ? `: ${p.details}` : ''}`).join('\n')
  : '- 未設定'}

【目標】
${businessInfo.goals && businessInfo.goals.length > 0 
  ? businessInfo.goals.map(g => `- ${g}`).join('\n')
  : '- 未設定'}

【課題】
${businessInfo.challenges && businessInfo.challenges.length > 0 
  ? businessInfo.challenges.map(c => `- ${c}`).join('\n')
  : '- 未設定'}
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
- トーン: ${settings.tone || 'フレンドリー'}
- 有効機能: ${settings.features && settings.features.length > 0 ? settings.features.join(', ') : 'なし'}
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
      prompt += '\n【SNS AI設定】\n';
      enabledSNS.forEach(([sns, settings]) => {
        prompt += `- ${sns.toUpperCase()}: トーン「${settings.tone || 'フレンドリー'}」`;
        if (settings.features && settings.features.length > 0) {
          prompt += ` | 機能: ${settings.features.join(', ')}`;
        }
        prompt += '\n';
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
- 投稿タイプ: ${postType || '未指定'}
- クライアントの目標を意識した内容にする
- ターゲット市場（${userProfile.businessInfo.targetMarket}）に響く表現を使う
- 課題（${userProfile.businessInfo.challenges.join(', ')}）を解決するヒントを含める
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
${analyticsData && analyticsData.length > 0 
  ? `- 過去のデータ（${analyticsData.length}件）に基づいて分析`
  : '- 一般的なベストプラクティスに基づいて提案'}
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
    strategyValues?: string[];
    postCategories?: string[];
    brandConcept?: string;
    colorVisual?: string;
    tone?: string;
  },
  simulationResult?: {
    monthlyTarget?: number | string;
    feasibilityLevel?: string;
    postsPerWeek?: { feed?: number; reel?: number };
  }
): string => {
  const basePrompt = buildSystemPrompt(userProfile, snsType);

  // 計画データの整形
  const currentFollowers = formData?.currentFollowers || '未設定';
  const targetFollowers = formData?.targetFollowers || '未設定';
  const planPeriod = formData?.planPeriod || '未設定';
  const strategies = Array.isArray(formData?.strategyValues) && formData.strategyValues.length > 0
    ? formData.strategyValues.join(', ')
    : '未設定';
  const categories = Array.isArray(formData?.postCategories) && formData.postCategories.length > 0
    ? formData.postCategories.join(', ')
    : '未設定';
  
  // シミュレーション結果の整形
  const monthlyTarget = simulationResult?.monthlyTarget || 'N/A';
  const feasibility = simulationResult?.feasibilityLevel || 'N/A';
  const feedPosts = simulationResult?.postsPerWeek?.feed || 0;
  const reelPosts = simulationResult?.postsPerWeek?.reel || 0;

  const planInstructions = `
【運用計画生成の指示】
あなたは${userProfile.businessInfo.industry}業界に精通したInstagram戦略コンサルタントです。
このクライアントのために、**他社と差別化された、実践的で即実行可能な**運用計画を作成してください。

## 📊 クライアントの現状
- 業種: ${userProfile.businessInfo.industry}（競合が多い市場）
- 会社規模: ${userProfile.businessInfo.companySize}
- ターゲット市場: ${userProfile.businessInfo.targetMarket}
- 現在のフォロワー数: ${currentFollowers} → 目標: ${targetFollowers}（達成期間: ${planPeriod}）
- **目標**: ${userProfile.businessInfo.goals.join(', ')}
- **課題**: ${userProfile.businessInfo.challenges.join(', ')}

## 🎯 計画パラメータ
- ブランドコンセプト: ${formData?.brandConcept || '未設定'}
- メインカラー: ${formData?.colorVisual || '未設定'}
- 文章トーン: ${formData?.tone || '未設定'}
- 選択戦略: ${strategies}
- 投稿カテゴリ: ${categories}
- 週間投稿数: フィード${feedPosts}回、リール${reelPosts}回

## ⚠️ 重要な制約条件
${userProfile.snsAISettings[snsType] ? (() => {
  const settings = userProfile.snsAISettings[snsType] as { enabled: boolean; tone?: string; features?: string[]; manner?: string; cautions?: string; goals?: string; motivation?: string; additionalInfo?: string };
  return (settings.cautions ? `- NGワード/注意事項: ${settings.cautions}\n` : '') + (settings.manner ? `- マナー/ルール: ${settings.manner}` : '');
})() : ''}

## 📋 生成する内容（4つのセクション）

### ① **全体の投稿戦略**
**【差別化ポイント】**を明確にし、${userProfile.businessInfo.industry}業界で他社と差をつける独自の切り口を提示してください。
- なぜこのクライアントをフォローすべきか？の明確な価値提案
- ${userProfile.businessInfo.targetMarket}に刺さる具体的なメッセージング
- 課題「${userProfile.businessInfo.challenges[0] || 'なし'}」を逆手に取った戦略
${userProfile.businessInfo.catchphrase ? `- キャッチコピー「${userProfile.businessInfo.catchphrase}」をどう活かすか` : ''}

### ② **投稿構成の方向性**
**フィード、リール、ストーリーのバランスと役割**を提案してください：
- **フィード投稿**: 何を中心に発信するか（例: 情報提供7割、プロモーション3割）
  - どんな種類の投稿を作るか（Before/After、お客様の声、豆知識など）
  - 推奨する雰囲気やトーン
  
- **リール投稿**: どんな目的で活用するか（例: 認知拡大、トレンド参加）
  - どんなタイプのリールを作るか（ハウツー、ビフォーアフター、トレンド活用など）
  - フックの作り方の方向性（最初の3秒で何を見せるか）
  
- **ストーリー投稿**: どう使い分けるか（例: 日常発信、限定情報）
  - ストーリーで発信すべき内容の種類
  - エンゲージメント施策の方向性（質問、アンケート、クイズ）

- 投稿カテゴリ（${categories}）の効果的な配分方法

### ③ **カスタマージャーニー（タイムライン形式）**
**以下の形式で、各段階での投稿戦略を提示してください：**

① 認知段階
 ↓ [どんな投稿で注意を引くか]
 
② 興味段階
 ↓ [どんな情報で関心を深めるか]
 
③ 検討段階
 ↓ [どんな投稿で信頼を構築するか]
 
④ 行動段階
 ↓ [どう行動（予約、購入、フォロー）に繋げるか]

各段階で使うべき投稿タイプ（フィード/リール/ストーリー）も明記してください。

### ④ **注意点・成功のコツ**
**失敗パターン**と**成功のための具体的な数値目標**を含めてください：
- ❌ よくある失敗: [業種特有の失敗パターン]
- ✅ 成功のKPI: エンゲージメント率〇%、保存率〇%、シェア率〇%
- 💡 ${userProfile.businessInfo.industry}業界の成功事例から学ぶべきポイント

## 🎯 成果物の要件
1. **戦略的な方向性を明確に**（具体的なタイトル案は不要）
2. **数値目標を含める**（エンゲージメント率、保存数など）
3. **${userProfile.businessInfo.industry}業界の特性を最大限活用**
4. **競合との差別化を意識した独自性**
5. **クライアントの課題「${userProfile.businessInfo.challenges.join(', ')}」の解決策を織り込む**
6. **投稿ラボでの具体的な投稿生成の指針となる内容**
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
  const rating = monthlyData?.performanceRating || 'C';

  const reportInstructions = `
【月次レポート生成の指示（PDCA - Act）】
このクライアントのために、今月の振り返りと来月のアクションプランを作成してください。

## 今月のパフォーマンス
- アカウントスコア: ${currentScore}点（前月: ${previousScore}点、変動: ${scoreDiff > 0 ? '+' : ''}${scoreDiff}点）
- パフォーマンス評価: ${rating}
- 総投稿数: ${monthlyData?.totalPosts || 0}件
- 総エンゲージメント: ${monthlyData?.totalEngagement || 0}
- 平均エンゲージメント率: ${monthlyData?.avgEngagementRate || 0}%

## 運用計画の参照（PDCA - Plan）
${planSummary || '運用計画データなし'}

## 最近の投稿（PDCA - Do）
${recentPosts && recentPosts.length > 0 
  ? recentPosts.slice(0, 5).map((p, i) => `${i + 1}. ${p.title}${p.engagement ? ` (エンゲージメント: ${p.engagement})` : ''}`).join('\n')
  : '投稿データなし'}

## 改善提案（PDCA - Check）
${improvements && improvements.length > 0
  ? improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')
  : '改善提案データなし'}

## 生成する内容

以下の形式で月次レポートと来月のアクションプランを作成してください：

### 📊 今月の総括
- 運用計画の達成度
- スコア変動の要因分析
- 良かった点（3つ）
- 改善が必要な点（2つ）

### 🎯 来月のアクションプラン
1. **優先度：高（必須）**
   - 具体的なアクション（2-3個）
   - 期待される効果

2. **優先度：中（推奨）**
   - 具体的なアクション（2-3個）
   - 期待される効果

3. **優先度：低（余裕があれば）**
   - 具体的なアクション（1-2個）
   - 期待される効果

### 💡 具体的な投稿テーマ提案
- 来月の推奨投稿テーマ（5つ）
- 各テーマの投稿タイミングと期待効果

### 📈 目標設定
- 来月のスコア目標
- エンゲージメント目標
- 達成のための重点施策

## 重要事項
- クライアントの目標（${userProfile.businessInfo.goals.join(', ')}）を意識する
- 課題（${userProfile.businessInfo.challenges.join(', ')}）の解決を含める
- 実行可能で具体的な提案にする
- 前向きで励ましのトーンを維持する
`;

  return basePrompt + reportInstructions;
};

