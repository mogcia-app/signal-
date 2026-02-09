import { UserProfile } from "../types/user";
// 投稿タイプ別のプロンプトビルダーをインポート
import { buildFeedPrompt } from "./ai-prompts/feed-prompt";
import { buildReelPrompt } from "./ai-prompts/reel-prompt";
import { buildStoryPrompt } from "./ai-prompts/story-prompt";
import { buildSystemPrompt } from "./ai-prompts/base-prompt";
import { buildAnalysisPrompt } from "./ai-prompts/analysis-prompt";
import { buildTimeOptimizationPrompt } from "./ai-prompts/time-optimization-prompt";
import { buildPlanPrompt } from "./ai-prompts/plan-prompt";
import { buildReportPrompt } from "./ai-prompts/report-prompt";

// 再エクスポート（後方互換性のため）
export {
  buildFeedPrompt,
  buildReelPrompt,
  buildStoryPrompt,
  buildSystemPrompt,
  buildAnalysisPrompt,
  buildTimeOptimizationPrompt,
  buildPlanPrompt,
  buildReportPrompt,
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
