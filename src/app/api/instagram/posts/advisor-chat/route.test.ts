/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockAssertAiOutputAvailable = jest.fn();
const mockConsumeAiOutput = jest.fn();
const mockAcquireAiRequestLock = jest.fn();
const mockCompleteAiRequestLock = jest.fn();
const mockFailAiRequestLock = jest.fn();
const mockGetUserProfile = jest.fn();
const mockGetInstagramAlgorithmBrief = jest.fn();
const mockGetMonthlyActionFocusPrompt = jest.fn();
const mockLogImplicitAiAction = jest.fn();
const mockPostGet = jest.fn();
const mockAnalyticsGet = jest.fn();
const mockAnalyticsHistoryGet = jest.fn();

jest.mock("@/lib/server/auth-context", () => ({
  requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
}));

jest.mock("@/lib/server/ai-usage-limit", () => {
  class MockAiUsageLimitError extends Error {
    month = "2025-01";
    limit = 100;
    used = 0;
    remaining = 100;
  }

  return {
    AiUsageLimitError: MockAiUsageLimitError,
    assertAiOutputAvailable: (...args: unknown[]) => mockAssertAiOutputAvailable(...args),
    consumeAiOutput: (...args: unknown[]) => mockConsumeAiOutput(...args),
  };
});

jest.mock("@/lib/server/ai-idempotency", () => ({
  acquireAiRequestLock: (...args: unknown[]) => mockAcquireAiRequestLock(...args),
  buildAiRequestKey: () => "request-key",
  completeAiRequestLock: (...args: unknown[]) => mockCompleteAiRequestLock(...args),
  failAiRequestLock: (...args: unknown[]) => mockFailAiRequestLock(...args),
}));

jest.mock("@/lib/server/user-profile", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

jest.mock("@/lib/ai/instagram-algorithm-brief", () => ({
  getInstagramAlgorithmBrief: (...args: unknown[]) => mockGetInstagramAlgorithmBrief(...args),
}));

jest.mock("@/lib/ai/monthly-action-focus", () => ({
  getMonthlyActionFocusPrompt: (...args: unknown[]) => mockGetMonthlyActionFocusPrompt(...args),
}));

jest.mock("@/lib/ai/implicit-action-log", () => ({
  logImplicitAiAction: (...args: unknown[]) => mockLogImplicitAiAction(...args),
}));

jest.mock("@/lib/firebase-admin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => {
      if (name === "posts") {
        return {
          doc: () => ({
            get: (...args: unknown[]) => mockPostGet(...args),
          }),
        };
      }

      if (name === "analytics") {
        return {
          where: (...args: unknown[]) => {
            const [field] = args;
            if (field === "postId") {
              return {
                get: (...innerArgs: unknown[]) => mockAnalyticsGet(...innerArgs),
              };
            }
            return {
              where: (...innerArgs: unknown[]) => {
                const [innerField] = innerArgs;
                if (innerField === "postId") {
                  return {
                    get: (...lastArgs: unknown[]) => mockAnalyticsGet(...lastArgs),
                  };
                }
                return {
                  limit: () => ({
                    get: (...lastArgs: unknown[]) => mockAnalyticsHistoryGet(...lastArgs),
                  }),
                };
              },
              limit: () => ({
                get: (...innerMostArgs: unknown[]) => mockAnalyticsHistoryGet(...innerMostArgs),
              }),
            };
          },
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
  }),
}));

describe("API regression foundation: /api/instagram/posts/advisor-chat", () => {
  const loadRoute = async () => import("./route");
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    delete process.env.OPENAI_API_KEY;

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockAssertAiOutputAvailable.mockResolvedValue(undefined);
    mockConsumeAiOutput.mockResolvedValue({ month: "2025-01", used: 1, remaining: 99, limit: 100 });
    mockAcquireAiRequestLock.mockResolvedValue({ state: "acquired" });
    mockCompleteAiRequestLock.mockResolvedValue(undefined);
    mockFailAiRequestLock.mockResolvedValue(undefined);
    mockGetUserProfile.mockResolvedValue({ plan: "matsu" });
    mockGetInstagramAlgorithmBrief.mockResolvedValue("brief");
    mockGetMonthlyActionFocusPrompt.mockResolvedValue("focus");
    mockLogImplicitAiAction.mockResolvedValue(undefined);

    mockPostGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: "user-1",
        title: "保存される投稿の型",
        content: "チェックリスト形式で投稿作成の手順を紹介",
        postType: "feed",
        imageUrl: null,
      }),
    });

    const analyticsDoc = {
      postId: "post-1",
      category: "feed",
      title: "保存される投稿の型",
      content: "チェックリスト形式で投稿作成の手順を紹介",
      likes: 120,
      comments: 14,
      shares: 18,
      saves: 42,
      reposts: 6,
      followerIncrease: 9,
      interactionCount: 200,
      publishedAt: "2025-01-10T00:00:00.000Z",
      publishedTime: "09:00",
      createdAt: "2025-01-10T01:00:00.000Z",
    };

    mockAnalyticsGet.mockResolvedValue({
      empty: false,
      docs: [{ data: () => analyticsDoc }],
    });

    mockAnalyticsHistoryGet.mockResolvedValue({
      docs: [
        { data: () => analyticsDoc },
        {
          data: () => ({
            ...analyticsDoc,
            postId: "post-2",
            likes: 70,
            comments: 8,
            shares: 7,
            saves: 20,
            reposts: 2,
            followerIncrease: 3,
            createdAt: "2025-01-05T01:00:00.000Z",
          }),
        },
        {
          data: () => ({
            ...analyticsDoc,
            postId: "post-3",
            likes: 65,
            comments: 6,
            shares: 9,
            saves: 22,
            reposts: 1,
            followerIncrease: 4,
            createdAt: "2025-01-03T01:00:00.000Z",
          }),
        },
      ],
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("returns only causal analysis for why_grew intent", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      createNextJsonRequest("http://localhost:3000/api/instagram/posts/advisor-chat", {
        method: "POST",
        body: {
          message: "なぜ伸びた？",
          selectedPostId: "post-1",
        },
      }) as never,
    );
    const body = await readJson<{ success: boolean; data: { reply: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reply).toContain("保存42");
    expect(body.data.reply).not.toContain("次の1アクション");
  });

  test("returns only the next action block for next_change intent", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      createNextJsonRequest("http://localhost:3000/api/instagram/posts/advisor-chat", {
        method: "POST",
        body: {
          message: "次の一手は？",
          selectedPostId: "post-1",
        },
      }) as never,
    );
    const body = await readJson<{ success: boolean; data: { reply: string } }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reply).toMatch(/^次の1アクション\n/);
    expect(body.data.reply).toContain("次回は");
    expect(body.data.reply).toMatch(/(チェックリスト|比較|意見募集|フォロー転換|結論先出し)型/);
    expect(body.data.reply).not.toContain("15文字");
    expect(body.data.reply).not.toContain("質問CTA");
  });
});
