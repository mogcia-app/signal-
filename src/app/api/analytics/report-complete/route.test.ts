/** @jest-environment node */

const mockRequireAuthContext = jest.fn();
const mockBuildErrorResponse = jest.fn();
const mockGetUserProfile = jest.fn();
const mockCanAccessFeature = jest.fn();
const mockFetchReportRepositoryData = jest.fn();
const mockFetchPostSummaries = jest.fn();
const mockBuildReportComplete = jest.fn();
const mockCreateReportAiClient = jest.fn();

jest.mock("@/lib/server/auth-context", () => ({
  requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
  buildErrorResponse: (...args: unknown[]) => mockBuildErrorResponse(...args),
}));

jest.mock("@/lib/server/user-profile", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

jest.mock("@/lib/plan-access", () => ({
  canAccessFeature: (...args: unknown[]) => mockCanAccessFeature(...args),
}));

jest.mock("@/repositories/report-repository", () => ({
  ReportRepository: {
    fetchReportRepositoryData: (...args: unknown[]) => mockFetchReportRepositoryData(...args),
    fetchPostSummaries: (...args: unknown[]) => mockFetchPostSummaries(...args),
  },
}));

jest.mock("@/repositories/monthly-review-store", () => ({
  monthlyReviewStore: { save: jest.fn(), load: jest.fn() },
}));

jest.mock("@/domain/analysis/report/usecases/build-report-complete", () => ({
  buildReportComplete: (...args: unknown[]) => mockBuildReportComplete(...args),
}));

jest.mock("@/domain/analysis/report/usecases/create-report-ai-client", () => ({
  createReportAiClient: (...args: unknown[]) => mockCreateReportAiClient(...args),
}));

describe("GET /api/analytics/report-complete", () => {
  const loadRoute = async () => {
    const route = await import("@/app/api/analytics/report-complete/route");
    return route.GET;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateReportAiClient.mockReturnValue({ provider: "test-ai-client" });
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockGetUserProfile.mockResolvedValue({ plan: "pro" });
    mockCanAccessFeature.mockReturnValue(true);
    mockFetchReportRepositoryData.mockResolvedValue({ raw: "report-data" });
    mockFetchPostSummaries.mockResolvedValue([]);
  });

  test("returns success response with stable payload shape", async () => {
    mockBuildReportComplete.mockResolvedValue({
      performanceScore: { score: 78, rating: "A", label: "良好", color: "green" },
      riskAlerts: [{ id: "risk-1", severity: "warning", title: "test", description: "test", recommendation: "test" }],
      feedbackSentiment: { total: 10, positive: 7, negative: 2, neutral: 1, positiveRate: 70, withCommentCount: 6 },
      postDeepDive: { posts: [{ id: "post-1", title: "Post 1", postType: "feed", createdAt: "2026-02-01" }] },
      aiLearningReferences: {
        masterContext: { learningPhase: "growth" },
        references: [{ id: "ref-1", sourceType: "analytics", label: "分析参照" }],
        snapshotReferences: [{ id: "snap-1", status: "gold", score: 0.9, summary: "good" }],
      },
      postSummaries: [
        {
          postId: "post-1",
          summary: "summary",
          strengths: ["strength"],
          improvements: ["improvement"],
          recommendedActions: ["action"],
          reach: 1234,
        },
      ],
      monthlyReview: {
        review: "review text",
        actionPlans: [],
        hasPlan: true,
        analyzedCount: 12,
      },
    });

    const GET = await loadRoute();
    const request = { url: "http://localhost:3000/api/analytics/report-complete?date=2026-02" } as Request;
    const response = await GET(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        success: true,
        usage: null,
        data: expect.objectContaining({
          performanceScore: { score: 78, rating: "A", label: "良好", color: "green" },
          monthlyReview: expect.objectContaining({
            review: "review text",
            analyzedCount: 12,
          }),
          postDeepDive: {
            posts: [{ id: "post-1", title: "Post 1", postType: "feed", createdAt: "2026-02-01" }],
          },
        }),
      })
    );
    expect(mockFetchReportRepositoryData).toHaveBeenCalledWith("user-1", "2026-02", { plan: "pro" });
    expect(mockBuildReportComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        month: "2026-02",
        forceRegenerate: false,
        reportData: { raw: "report-data" },
        fetchPostSummaries: expect.any(Function),
        fetchAiLearningReferences: expect.any(Function),
      })
    );
  });

  test("returns 400 when date format is invalid", async () => {
    const GET = await loadRoute();
    const request = { url: "http://localhost:3000/api/analytics/report-complete?date=2026/02" } as Request;
    const response = await GET(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: "date parameter must be in YYYY-MM format",
    });
    expect(mockFetchReportRepositoryData).not.toHaveBeenCalled();
    expect(mockBuildReportComplete).not.toHaveBeenCalled();
  });

  test("returns mapped error response when exception is thrown", async () => {
    const thrown = new Error("unexpected failure");
    mockRequireAuthContext.mockRejectedValueOnce(thrown);
    mockBuildErrorResponse.mockReturnValueOnce({
      status: 429,
      body: {
        success: false,
        error: "rate_limited",
      },
    });

    const GET = await loadRoute();
    const request = { url: "http://localhost:3000/api/analytics/report-complete?date=2026-02" } as Request;
    const response = await GET(request as never);
    const body = await response.json();

    expect(mockBuildErrorResponse).toHaveBeenCalledWith(thrown);
    expect(response.status).toBe(429);
    expect(body).toEqual({
      success: false,
      error: "rate_limited",
    });
  });
});
