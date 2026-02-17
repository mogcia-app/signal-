import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export function canGenerateTodayTaskAiForUid(uid: string): boolean {
  const allowlist = process.env.HOME_TODAY_TASKS_AI_UID_ALLOWLIST?.trim();
  if (!allowlist) {
    return true;
  }

  const allowedUids = allowlist
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return allowedUids.includes(uid);
}

function stripHashtagsFromContent(raw: string): string {
  if (!raw) {return raw;}

  const lines = raw
    .split("\n")
    .map((line) => line.trimEnd());

  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) {return true;}
    if (/^(?:[＃#][^\s#＃]+[\s　]*)+$/.test(trimmed)) {
      return false;
    }
    return true;
  });

  let cleaned = filteredLines.join("\n").trim();
  cleaned = cleaned.replace(/\s*(?:[＃#][^\s#＃]+[\s　]*){2,}$/u, "").trim();
  return cleaned;
}

type PlanDataForGeneration = {
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  aiPersona: {
    tone: string;
    style: string;
    personality: string;
    interests: string[];
  };
  simulation: {
    postTypes: {
      reel: { weeklyCount: number; followerEffect: number };
      feed: { weeklyCount: number; followerEffect: number };
      story: { weeklyCount: number; followerEffect: number };
    };
  };
};

export async function generatePostContent(
  postDescription: string,
  postType: "feed" | "reel" | "story",
  userProfile: { name?: string } | null,
  options?: {
    brandName?: string;
    regionName?: string;
    origin?: string;
    cookie?: string;
    planData?: PlanDataForGeneration;
  }
): Promise<{ content: string; hashtags: string[] }> {
  const normalizeTag = (raw: unknown): string => {
    if (typeof raw !== "string") {return "";}
    return raw
      .replace(/[＃#]+/g, "")
      .replace(/\s+/g, "")
      .trim();
  };

  const withRequiredTags = (rawTags: unknown[]): string[] => {
    const brandTag = normalizeTag(options?.brandName || userProfile?.name || "");
    const regionTag = normalizeTag(options?.regionName || "");
    const aiTags = rawTags.map(normalizeTag).filter(Boolean);
    const unique: string[] = [];
    const pushUnique = (tag: string) => {
      if (!tag) {return;}
      if (!unique.includes(tag)) {
        unique.push(tag);
      }
    };

    pushUnique(brandTag);
    pushUnique(regionTag);
    for (const tag of aiTags) {
      pushUnique(tag);
      if (unique.length >= 5) {break;}
    }

    return unique.slice(0, 5);
  };

  if (!openai) {
    return {
      content: postDescription,
      hashtags: withRequiredTags([]),
    };
  }

  try {
    if (options?.origin) {
      const fallbackPlanData = options.planData || {
        title: postDescription.slice(0, 30) || "投稿テーマ",
        targetFollowers: 100,
        currentFollowers: 90,
        planPeriod: "1ヶ月",
        targetAudience: "",
        category: "",
        strategies: ["認知拡大"],
        aiPersona: {
          tone: "親しみやすい",
          style: "自然",
          personality: "誠実",
          interests: [],
        },
        simulation: {
          postTypes: {
            reel: { weeklyCount: 1, followerEffect: 1 },
            feed: { weeklyCount: 1, followerEffect: 1 },
            story: { weeklyCount: 1, followerEffect: 1 },
          },
        },
      };

      const labResponse = await fetch(`${options.origin}/api/ai/post-generation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: options.cookie || "",
        },
        body: JSON.stringify({
          prompt: postDescription,
          postType,
          action: "generatePost",
          autoGenerate: false,
          planData: fallbackPlanData,
        }),
      });

      if (labResponse.ok) {
        const labData = await labResponse.json();
        const generatedContent = labData?.data?.content;
        const generatedHashtags = labData?.data?.hashtags;
        if (typeof generatedContent === "string") {
          return {
            content: stripHashtagsFromContent(generatedContent || postDescription),
            hashtags: withRequiredTags(Array.isArray(generatedHashtags) ? generatedHashtags : []),
          };
        }
      }
    }

    const systemPrompt = `あなたはInstagramマーケティングの専門家です。与えられた投稿テーマに基づいて、魅力的な投稿文と適切なハッシュタグを生成してください。
JSON形式で以下の形式で返してください：
{
  "content": "投稿文（改行を含む、200文字程度）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2", ...]（5-10個程度）
}`;

    const userPrompt = `以下のテーマで${postType === "feed" ? "フィード" : postType === "reel" ? "リール" : "ストーリーズ"}投稿の投稿文とハッシュタグを生成してください。

テーマ: ${postDescription}

${userProfile?.name ? `ブランド名: ${userProfile.name}` : ""}

エンゲージメントを高める魅力的な投稿文と、適切なハッシュタグを生成してください。`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI response is empty");
    }

    const parsed = JSON.parse(content);
    return {
      content: stripHashtagsFromContent(parsed.content || postDescription),
      hashtags: withRequiredTags(Array.isArray(parsed.hashtags) ? parsed.hashtags : []),
    };
  } catch (error) {
    console.error("AI投稿文生成エラー:", error);
    return {
      content: postDescription,
      hashtags: withRequiredTags([]),
    };
  }
}
