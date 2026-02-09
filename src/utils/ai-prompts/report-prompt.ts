import { UserProfile } from "../../types/user";
import { buildSystemPrompt } from "./base-prompt";

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

