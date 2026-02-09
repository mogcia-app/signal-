import { UserProfile } from "../../types/user";
import { buildSystemPrompt } from "./base-prompt";

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

