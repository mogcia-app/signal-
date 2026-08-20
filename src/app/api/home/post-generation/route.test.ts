/** @jest-environment node */

import { createNextJsonRequest, readJson } from "@/test/api-route-test-helpers";

const mockRequireAuthContext = jest.fn();
const mockGetUserProfile = jest.fn();
const mockAcquireAiRequestLock = jest.fn();
const mockCompleteAiRequestLock = jest.fn();
const mockFailAiRequestLock = jest.fn();
const mockAssertAiOutputAvailable = jest.fn();
const mockConsumeAiOutput = jest.fn();
const mockCreate = jest.fn();

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    },
  }));
});

jest.mock("@/lib/server/auth-context", () => ({
  requireAuthContext: (...args: unknown[]) => mockRequireAuthContext(...args),
}));

jest.mock("@/lib/server/user-profile", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

jest.mock("@/lib/server/ai-usage-limit", () => ({
  AiUsageLimitError: class extends Error {},
  assertAiOutputAvailable: (...args: unknown[]) => mockAssertAiOutputAvailable(...args),
  consumeAiOutput: (...args: unknown[]) => mockConsumeAiOutput(...args),
}));

jest.mock("@/lib/server/ai-idempotency", () => ({
  acquireAiRequestLock: (...args: unknown[]) => mockAcquireAiRequestLock(...args),
  buildAiRequestKey: () => "request-key",
  completeAiRequestLock: (...args: unknown[]) => mockCompleteAiRequestLock(...args),
  failAiRequestLock: (...args: unknown[]) => mockFailAiRequestLock(...args),
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("@/lib/ai/monthly-action-focus", () => ({
  getMonthlyActionFocus: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/ai/instagram-algorithm-brief", () => ({
  getInstagramAlgorithmBrief: jest.fn().mockResolvedValue("brief"),
}));

jest.mock("@/lib/ai/implicit-action-log", () => ({
  logImplicitAiAction: jest.fn().mockResolvedValue(undefined),
}));

describe("/api/home/post-generation translateEnglish", () => {
  const loadRoute = async () => import("./route");

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    mockRequireAuthContext.mockResolvedValue({ uid: "user-1" });
    mockGetUserProfile.mockResolvedValue({ businessInfo: { industry: "Cafe" } });
    mockAcquireAiRequestLock.mockResolvedValue({ state: "acquired" });
    mockCompleteAiRequestLock.mockResolvedValue(undefined);
    mockFailAiRequestLock.mockResolvedValue(undefined);
    mockAssertAiOutputAvailable.mockResolvedValue(undefined);
    mockConsumeAiOutput.mockResolvedValue({
      month: "2026-05",
      limit: 100,
      used: 1,
      remaining: 99,
    });
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "Weekend Coffee Moment",
              content: "A small coffee break can brighten your day.\nSave this for your next cafe stop.",
              hashtags: ["coffee", "cafetime", "weekendvibes"],
            }),
          },
        },
      ],
    });
  });

  test("translates draft title/content/hashtags into English", async () => {
    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/post-generation", {
      method: "POST",
      body: {
        action: "translateEnglish",
        postType: "feed",
        prompt: "translate",
        sourceTitle: "週末のコーヒー時間",
        sourceContent: "今日は少しだけひと息。\n次のカフェ時間に保存しておいてください。",
        sourceHashtags: ["コーヒー", "カフェ時間", "週末"],
      },
    });

    const response = await POST(request);
    const body = await readJson<{
      success: boolean;
      data: { title: string; content: string; hashtags: string[] };
    }>(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        title: "Weekend Coffee Moment",
        content: "A small coffee break can brighten your day.\nSave this for your next cafe stop.",
        hashtags: ["coffee", "cafetime", "weekendvibes"],
      },
      usage: {
        month: "2026-05",
        limit: 100,
        used: 1,
        remaining: 99,
      },
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockConsumeAiOutput).toHaveBeenCalled();
  });

  test("uses Signal caption style for generated feed posts", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "AI活用を仕組みにする",
              content:
                "「ChatGPTは使っています」\n\nもちろん、それも立派な第一歩です。\n\nただ、会社全体でAIを活用するなら、**AIを業務フローそのものに組み込むこと。**\n\n保存して見返してください。",
              hashtags: ["生成AI", "AI導入", "業務効率化"],
              suggestedTime: "09:00",
              postHints: ["冒頭を読者の実際の発言にして、2行目で肯定してから課題へつなげる。"],
            }),
          },
        },
      ],
    });

    const { POST } = await loadRoute();
    const request = createNextJsonRequest("http://localhost:3000/api/home/post-generation", {
      method: "POST",
      body: {
        action: "generatePost",
        postType: "feed",
        prompt: "AI活用の考え方",
        operationPurpose: "consultation",
      },
    });

    const response = await POST(request);
    const body = await readJson<{
      success: boolean;
      data: { content: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.data.content).toContain("AIを業務フローそのものに組み込むこと。");
    expect(body.data.content).not.toContain("**");

    const createArgs = mockCreate.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(createArgs.messages[0].content).toContain("Signal.のInstagram投稿編集者");
    expect(createArgs.messages[1].content).toContain("【Signal.キャプション型】");
    expect(createArgs.messages[1].content).toContain("会話調の一言や引用風フック");
    expect(createArgs.messages[1].content).toContain("文字数目安は450〜900字");
    expect(createArgs.messages[1].content).toContain("最終本文にMarkdown記号を残さない");
  });
});
