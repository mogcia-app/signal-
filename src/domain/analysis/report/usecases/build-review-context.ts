import type { ReportAnalyticsDocument, ReportPlanDocument, ReportUserDocument } from "@/repositories/types";
import type { PostSummaryData } from "@/types/report";

interface BuildReviewContextInput {
  analyticsByPostId: Map<string, ReportAnalyticsDocument>;
  postSummaries: PostSummaryData[];
  totalReach: number;
  hasPlan: boolean;
  plan: ReportPlanDocument | null;
  user: ReportUserDocument | null;
}

export interface ReviewContext {
  postTypeInfo: string;
  topPostInfo: string;
  postSummaryInsights: string;
  businessInfoText: string;
  aiSettingsText: string;
  planTitle: string | undefined;
}

export function buildReviewContext(input: BuildReviewContextInput): ReviewContext {
  const postTypeStats: Record<string, { count: number; totalReach: number; labels: string[] }> = {};
  const postReachMap = new Map<string, { reach: number; title: string; type: string }>();

  input.analyticsByPostId.forEach((analytics, postId) => {
    const postType = analytics.postType || "unknown";
    const postTitle = analytics.title || "タイトルなし";
    const reach = analytics.reach || 0;

    if (!postTypeStats[postType]) {
      postTypeStats[postType] = { count: 0, totalReach: 0, labels: [] };
    }
    postTypeStats[postType].count += 1;
    postTypeStats[postType].totalReach += reach;
    if (!postTypeStats[postType].labels.includes(postTitle)) {
      postTypeStats[postType].labels.push(postTitle);
    }

    postReachMap.set(postId, { reach, title: postTitle, type: postType });
  });

  const typeLabelMap: Record<string, string> = {
    feed: "画像投稿",
    reel: "リール",
    story: "ストーリー",
    carousel: "カルーセル",
    video: "動画",
    unknown: "その他",
  };

  const postTypeArray = Object.entries(postTypeStats)
    .map(([type, stats]) => ({
      type,
      label: typeLabelMap[type] || type,
      count: stats.count,
      totalReach: stats.totalReach,
      percentage: input.totalReach > 0 ? (stats.totalReach / input.totalReach) * 100 : 0,
    }))
    .sort((a, b) => b.totalReach - a.totalReach);

  const topPost = Array.from(postReachMap.entries())
    .map(([postId, data]) => ({ postId, ...data }))
    .sort((a, b) => b.reach - a.reach)[0];

  const allStrengths: string[] = [];
  const allRecommendedActions: string[] = [];
  const highPerformanceStrengths: string[] = [];

  const allAnalyzedPosts = Array.from(input.analyticsByPostId.entries())
    .map(([postId, analytics]) => ({
      postId,
      reach: analytics.reach || 0,
      summary: input.postSummaries.find((summary) => summary.postId === postId) || null,
    }))
    .sort((a, b) => b.reach - a.reach);

  if (allAnalyzedPosts.length > 0) {
    const top30Percent = Math.ceil(allAnalyzedPosts.length * 0.3);

    allAnalyzedPosts.forEach((post) => {
      if (!post.summary) {
        return;
      }
      allStrengths.push(...post.summary.strengths);
      allRecommendedActions.push(...post.summary.recommendedActions);
      const isHighPerformance = allAnalyzedPosts.slice(0, top30Percent).some((p) => p.postId === post.postId);
      if (isHighPerformance) {
        highPerformanceStrengths.push(...post.summary.strengths);
      }
    });
  }

  const topStrengths = aggregateTopWords(allStrengths, 5);
  const topActions = aggregateTopWords(allRecommendedActions, 5);
  const topHighPerformanceStrengths = aggregateTopWords(highPerformanceStrengths, 3);

  let postSummaryInsights = "";
  if (allAnalyzedPosts.length > 0) {
    const insightsParts: string[] = [];
    insightsParts.push(`投稿ごとのAI分析結果（${allAnalyzedPosts.length}件の投稿から抽出）:`);

    if (topStrengths.length > 0) {
      insightsParts.push(`- 頻出する強み: ${topStrengths.join("、")}`);
    }
    if (topHighPerformanceStrengths.length > 0) {
      insightsParts.push(`- 高パフォーマンス投稿の共通点: ${topHighPerformanceStrengths.join("、")}`);
    }
    if (topActions.length > 0) {
      insightsParts.push(`- 頻出する推奨アクション: ${topActions.join("、")}`);
    }

    postSummaryInsights = insightsParts.join("\n");
  }

  const postTypeInfo =
    postTypeArray.length > 0
      ? postTypeArray
          .map((stat, index) => {
            const order = index === 0 ? "最も多く" : index === 1 ? "次いで" : "最後に";
            return `${order}${stat.label}が${stat.count}件（全体の${stat.percentage.toFixed(0)}％）`;
          })
          .join("、")
      : "投稿タイプのデータがありません";

  const topPostInfo = topPost
    ? `「${topPost.title}」投稿で、${topPost.reach.toLocaleString()}回閲覧`
    : "データがありません";

  const { businessInfoText, aiSettingsText } = buildBusinessAndAiSettingsText(input.user);

  return {
    postTypeInfo,
    topPostInfo,
    postSummaryInsights,
    businessInfoText,
    aiSettingsText,
    planTitle: input.hasPlan ? input.plan?.title || "運用計画" : undefined,
  };
}

function aggregateTopWords(values: string[], limit: number): string[] {
  const frequency = new Map<string, number>();
  values.forEach((value) => {
    frequency.set(value, (frequency.get(value) || 0) + 1);
  });
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function buildBusinessAndAiSettingsText(user: ReportUserDocument | null): {
  businessInfoText: string;
  aiSettingsText: string;
} {
  if (!user) {
    return { businessInfoText: "", aiSettingsText: "" };
  }

  const businessInfo = (user.businessInfo || {}) as Record<string, unknown>;
  const snsAISettingsRoot = (user.snsAISettings || {}) as Record<string, unknown>;
  const snsAISettings =
    (snsAISettingsRoot.instagram as Record<string, unknown> | undefined) ||
    (snsAISettingsRoot as Record<string, unknown>);

  const businessInfoParts: string[] = [];
  if (typeof businessInfo.industry === "string" && businessInfo.industry) {
    businessInfoParts.push(`業種: ${businessInfo.industry}`);
  }
  if (typeof businessInfo.companySize === "string" && businessInfo.companySize) {
    businessInfoParts.push(`会社規模: ${businessInfo.companySize}`);
  }
  if (typeof businessInfo.businessType === "string" && businessInfo.businessType) {
    businessInfoParts.push(`事業形態: ${businessInfo.businessType}`);
  }
  if (typeof businessInfo.description === "string" && businessInfo.description) {
    businessInfoParts.push(`事業内容: ${businessInfo.description}`);
  }
  if (typeof businessInfo.catchphrase === "string" && businessInfo.catchphrase) {
    businessInfoParts.push(`キャッチコピー: ${businessInfo.catchphrase}`);
  }

  if (Array.isArray(businessInfo.targetMarket) && businessInfo.targetMarket.length > 0) {
    businessInfoParts.push(`ターゲット市場: ${businessInfo.targetMarket.map(String).join("、")}`);
  }

  let productsOrServicesText = "";
  if (Array.isArray(businessInfo.productsOrServices) && businessInfo.productsOrServices.length > 0) {
    const products = businessInfo.productsOrServices
      .map((item) => {
        const product = item as { name?: unknown; details?: unknown };
        if (typeof product.name !== "string" || !product.name) {
          return null;
        }
        if (typeof product.details === "string" && product.details) {
          return `${product.name}（${product.details}）`;
        }
        return product.name;
      })
      .filter((value): value is string => Boolean(value));

    if (products.length > 0) {
      businessInfoParts.push(`商品・サービス: ${products.join("、")}`);
      productsOrServicesText = products
        .map((item) => item.split("（")[0])
        .filter(Boolean)
        .join("、");
    }
  }

  if (Array.isArray(businessInfo.goals) && businessInfo.goals.length > 0) {
    businessInfoParts.push(`目標: ${businessInfo.goals.map(String).join("、")}`);
  }
  if (Array.isArray(businessInfo.challenges) && businessInfo.challenges.length > 0) {
    businessInfoParts.push(`課題: ${businessInfo.challenges.map(String).join("、")}`);
  }

  let businessInfoText = "";
  if (businessInfoParts.length > 0) {
    businessInfoText = `\n【ビジネス情報】\n${businessInfoParts.join("\n")}`;
    if (productsOrServicesText) {
      businessInfoText += `\n\n【重要：提案で必ず使用する具体的な商品・サービス名】\n${productsOrServicesText}`;
    }
  }

  const aiSettingsParts: string[] = [];
  if (typeof snsAISettings.tone === "string" && snsAISettings.tone) {
    aiSettingsParts.push(`トーン: ${snsAISettings.tone}`);
  }
  if (typeof snsAISettings.manner === "string" && snsAISettings.manner) {
    aiSettingsParts.push(`マナー・ルール: ${snsAISettings.manner}`);
  }
  if (typeof snsAISettings.goals === "string" && snsAISettings.goals) {
    aiSettingsParts.push(`Instagram運用の目標: ${snsAISettings.goals}`);
  }
  if (typeof snsAISettings.motivation === "string" && snsAISettings.motivation) {
    aiSettingsParts.push(`運用動機: ${snsAISettings.motivation}`);
  }
  if (typeof snsAISettings.additionalInfo === "string" && snsAISettings.additionalInfo) {
    aiSettingsParts.push(`その他参考情報: ${snsAISettings.additionalInfo}`);
  }

  const aiSettingsText = aiSettingsParts.length > 0 ? `\n【Instagram AI設定】\n${aiSettingsParts.join("\n")}` : "";

  return { businessInfoText, aiSettingsText };
}
