import { UserProfile } from "../../types/user";
import { buildSystemPrompt } from "./base-prompt";

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

