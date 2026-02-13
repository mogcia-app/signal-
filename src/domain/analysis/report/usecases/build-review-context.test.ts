import { buildReviewContext } from "@/domain/analysis/report/usecases/build-review-context";
import type {
  ReportAnalyticsDocument,
  ReportPlanDocument,
  ReportUserDocument,
} from "@/repositories/types";
import type { PostSummaryData } from "@/types/report";

function analytics(overrides: Partial<ReportAnalyticsDocument>): ReportAnalyticsDocument {
  return {
    postId: "p-1",
    title: "Title",
    postType: "feed",
    publishedAt: new Date("2026-02-10T00:00:00.000Z"),
    publishedTime: "10:00",
    likes: 10,
    comments: 5,
    shares: 1,
    reach: 100,
    saves: 3,
    followerIncrease: 2,
    ...overrides,
  };
}

function summary(overrides: Partial<PostSummaryData>): PostSummaryData {
  return {
    postId: "p-1",
    summary: "summary",
    strengths: ["保存されやすい構成"],
    improvements: [],
    recommendedActions: ["CTAを明確化"],
    reach: 100,
    ...overrides,
  };
}

describe("buildReviewContext", () => {
  test("builds postTypeInfo and topPostInfo from analytics", () => {
    const analyticsByPostId = new Map<string, ReportAnalyticsDocument>([
      ["p-1", analytics({ postId: "p-1", title: "Feed Top", postType: "feed", reach: 700 })],
      ["p-2", analytics({ postId: "p-2", title: "Reel Mid", postType: "reel", reach: 300 })],
    ]);

    const result = buildReviewContext({
      analyticsByPostId,
      postSummaries: [],
      totalReach: 1000,
      hasPlan: false,
      plan: null,
      user: null,
    });

    expect(result.postTypeInfo).toContain("最も多く画像投稿が1件（全体の70％）");
    expect(result.postTypeInfo).toContain("次いでリールが1件（全体の30％）");
    expect(result.topPostInfo).toBe("「Feed Top」投稿で、700回閲覧");
    expect(result.planTitle).toBeUndefined();
  });

  test("aggregates strengths/actions into postSummaryInsights and resolves plan title", () => {
    const analyticsByPostId = new Map<string, ReportAnalyticsDocument>([
      ["p-1", analytics({ postId: "p-1", reach: 300, title: "A" })],
      ["p-2", analytics({ postId: "p-2", reach: 200, title: "B" })],
      ["p-3", analytics({ postId: "p-3", reach: 100, title: "C" })],
    ]);

    const postSummaries: PostSummaryData[] = [
      summary({
        postId: "p-1",
        strengths: ["冒頭フック", "冒頭フック", "具体例の提示"],
        recommendedActions: ["CTA追加", "CTA追加"],
      }),
      summary({
        postId: "p-2",
        strengths: ["具体例の提示"],
        recommendedActions: ["ハッシュタグ最適化"],
      }),
      summary({
        postId: "p-3",
        strengths: ["構図の統一"],
        recommendedActions: ["CTA追加"],
      }),
    ];

    const plan: ReportPlanDocument = {
      title: "Q1運用計画",
      targetFollowers: 10000,
      currentFollowers: 5000,
      strategies: [],
      postCategories: [],
    };

    const result = buildReviewContext({
      analyticsByPostId,
      postSummaries,
      totalReach: 600,
      hasPlan: true,
      plan,
      user: null,
    });

    expect(result.planTitle).toBe("Q1運用計画");
    expect(result.postSummaryInsights).toContain("投稿ごとのAI分析結果（3件の投稿から抽出）");
    expect(result.postSummaryInsights).toContain("頻出する強み");
    expect(result.postSummaryInsights).toContain("頻出する推奨アクション");
    expect(result.postSummaryInsights).toContain("高パフォーマンス投稿の共通点");
    expect(result.postSummaryInsights).toContain("冒頭フック");
    expect(result.postSummaryInsights).toContain("CTA追加");
  });

  test("builds businessInfoText and aiSettingsText when user data exists", () => {
    const user: ReportUserDocument = {
      businessInfo: {
        industry: "美容",
        companySize: "1-10名",
        businessType: "B2C",
        description: "スキンケア事業",
        catchphrase: "肌に自信を",
        targetMarket: ["20代女性", "30代女性"],
        productsOrServices: [
          { name: "セラムX", details: "保湿美容液" },
          { name: "クリームY" },
        ],
        goals: ["認知拡大"],
        challenges: ["保存率向上"],
      } as Record<string, unknown>,
      snsAISettings: {
        instagram: {
          tone: "親しみやすい",
          manner: "誇張しない",
          goals: "保存率改善",
          motivation: "ブランド価値向上",
          additionalInfo: "季節要因を考慮",
        },
      } as Record<string, unknown>,
    };

    const result = buildReviewContext({
      analyticsByPostId: new Map<string, ReportAnalyticsDocument>(),
      postSummaries: [],
      totalReach: 0,
      hasPlan: false,
      plan: null,
      user,
    });

    expect(result.postTypeInfo).toBe("投稿タイプのデータがありません");
    expect(result.topPostInfo).toBe("データがありません");
    expect(result.businessInfoText).toContain("【ビジネス情報】");
    expect(result.businessInfoText).toContain("業種: 美容");
    expect(result.businessInfoText).toContain("【重要：提案で必ず使用する具体的な商品・サービス名】");
    expect(result.businessInfoText).toContain("セラムX、クリームY");
    expect(result.aiSettingsText).toContain("【Instagram AI設定】");
    expect(result.aiSettingsText).toContain("トーン: 親しみやすい");
  });
});
