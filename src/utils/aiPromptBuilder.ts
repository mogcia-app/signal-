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
- 事業内容: ${businessInfo.description || '未設定'}

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
    const settings = snsAISettings[snsType];
    if (settings.enabled) {
      prompt += `
【${snsType.toUpperCase()} AI設定】
- トーン: ${settings.tone || 'フレンドリー'}
- 有効機能: ${settings.features && settings.features.length > 0 ? settings.features.join(', ') : 'なし'}
`;
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

