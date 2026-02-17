import { NextRequest, NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuthContext } from "@/lib/server/auth-context";

interface AdvisorChatRequest {
  message?: unknown;
  selectedPostId?: unknown;
}

interface AnalyticsDoc {
  likes?: unknown;
  comments?: unknown;
  shares?: unknown;
  reposts?: unknown;
  saves?: unknown;
  followerIncrease?: unknown;
  engagementRate?: unknown;
  interactionCount?: unknown;
  reachedAccounts?: unknown;
  profileVisits?: unknown;
  profileFollows?: unknown;
  externalLinkTaps?: unknown;
  reelInteractionCount?: unknown;
  reelReachedAccounts?: unknown;
  reelPlayTime?: unknown;
  reelAvgPlayTime?: unknown;
  reelSkipRate?: unknown;
  reelNormalSkipRate?: unknown;
  publishedAt?: unknown;
  createdAt?: unknown;
  category?: unknown;
}

const normalizeText = (value: unknown): string => String(value || "").trim();

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "object" && value && "toDate" in value) {
    const converted = (value as { toDate?: () => Date }).toDate?.();
    return converted && !Number.isNaN(converted.getTime()) ? converted : null;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const formatPostType = (value: string): string => {
  if (value === "reel") {
    return "リール";
  }
  if (value === "story") {
    return "ストーリーズ";
  }
  return "フィード";
};

const buildSummary = (params: {
  postType: "feed" | "reel" | "story";
  title: string;
  analytics: AnalyticsDoc;
  message: string;
}) => {
  const { postType, title, analytics, message } = params;

  const likes = toNumber(analytics.likes);
  const comments = toNumber(analytics.comments);
  const shares = toNumber(analytics.shares);
  const reposts = toNumber(analytics.reposts);
  const saves = toNumber(analytics.saves);
  const followerIncrease = toNumber(analytics.followerIncrease);
  const engagementRate = toNumber(analytics.engagementRate);

  const interactionCount =
    postType === "reel"
      ? toNumber(analytics.reelInteractionCount) || likes + comments + shares + saves + reposts
      : toNumber(analytics.interactionCount) || likes + comments + shares + saves + reposts;

  const reachedAccounts =
    postType === "reel" ? toNumber(analytics.reelReachedAccounts) : toNumber(analytics.reachedAccounts);

  const profileVisits = toNumber(analytics.profileVisits);
  const profileFollows = toNumber(analytics.profileFollows);
  const externalLinkTaps = toNumber(analytics.externalLinkTaps);
  const reelPlayTime = toNumber(analytics.reelPlayTime);
  const reelAvgPlayTime = toNumber(analytics.reelAvgPlayTime);
  const reelSkipRate = toNumber(analytics.reelSkipRate);
  const reelNormalSkipRate = toNumber(analytics.reelNormalSkipRate);

  const allCoreZero =
    likes === 0 &&
    comments === 0 &&
    shares === 0 &&
    saves === 0 &&
    reposts === 0 &&
    followerIncrease === 0 &&
    interactionCount === 0;

  const conversationStrength = comments + shares + saves;
  const tractionScore = likes + comments * 3 + shares * 4 + saves * 3 + followerIncrease * 5;

  let interpretation = "反応が入り始めており、改善余地がある中間フェーズです。";
  if (allCoreZero) {
    interpretation =
      "保存済みデータ上は主要指標が0で、投稿内容より前に露出導線（告知・初速）が不足している状態です。";
  } else if (tractionScore >= 80 || conversationStrength >= 15 || followerIncrease >= 5) {
    interpretation =
      "保存・シェア・コメントの複合反応が出ており、内容の価値がフォロワーに伝わっている状態です。";
  } else if (likes > 0 && conversationStrength === 0) {
    interpretation =
      "閲覧後のリアクションは出ていますが、会話や共有に繋がる要素が弱く、拡散余地が残っています。";
  }

  const messageLower = message.toLowerCase();
  let action = "次回は冒頭20文字でベネフィットを1つ明示し、末尾に質問を1つ入れてコメント導線を作ってください。";

  if (allCoreZero) {
    action =
      "次回は投稿前にストーリーズで予告を1本入れ、投稿直後30分で既存フォロワーへ導線を作って初速を確保してください。";
  } else if (messageLower.includes("なぜ伸") || messageLower.includes("バズ") || messageLower.includes("良かった")) {
    action =
      "次回は今回反応が強かった要素（保存されやすい情報または共有したくなる一言）を冒頭に再配置して再現性を検証してください。";
  } else if (messageLower.includes("悪") || messageLower.includes("弱") || messageLower.includes("直")) {
    action =
      "次回は1投稿1メッセージに絞り、画像内テキストを15文字以内に短縮して主題の伝達速度を上げてください。";
  } else if (postType === "reel" && reelSkipRate > 0) {
    action =
      "次回リールは冒頭2秒で結論を先出しし、テロップを短文化してスキップ率の改善を確認してください。";
  } else if (profileVisits > 0 && profileFollows === 0) {
    action =
      "次回はCTAを『プロフィールの固定投稿へ』の1文に統一し、プロフィール遷移後の離脱を減らしてください。";
  } else if (externalLinkTaps > 0) {
    action =
      "次回はリンクタップ前提で、投稿本文中に『誰向けか』を1行追加し、無駄クリックを減らしてください。";
  }

  const evidenceLines: string[] = [
    `対象投稿: ${title || "タイトル未設定"}（${formatPostType(postType)}）`,
    `反応指標: いいね ${likes} / コメント ${comments} / シェア ${shares} / 保存 ${saves} / リポスト ${reposts}`,
    `補助指標: インタラクション ${interactionCount} / フォロワー増加 ${followerIncrease} / エンゲージメント率 ${engagementRate}%`,
  ];

  if (postType === "feed") {
    evidenceLines.push(
      `フィード補足: リーチしたアカウント ${reachedAccounts} / プロフィールアクセス ${profileVisits} / プロフィールフォロー ${profileFollows} / 外部リンクタップ ${externalLinkTaps}`,
    );
  }

  if (postType === "reel") {
    evidenceLines.push(
      `リール補足: リーチしたアカウント ${reachedAccounts} / 再生時間 ${reelPlayTime}秒 / 平均再生時間 ${reelAvgPlayTime}秒 / スキップ率 ${reelSkipRate}% / 通常視聴でのスキップ率 ${reelNormalSkipRate}%`,
    );
  }

  const reply = [
    "根拠データ",
    ...evidenceLines,
    "",
    "解釈",
    interpretation,
    "",
    "次の1アクション",
    action,
  ].join("\n");

  return {
    reply,
    suggestedQuestions: [
      "なぜ伸びた？",
      "何を直せばいい？",
      "次回何を変える？",
    ],
  };
};

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-posts-advisor-chat", limit: 40, windowSeconds: 60 },
      auditEventName: "instagram_posts_advisor_chat",
    });

    const body = (await request.json()) as AdvisorChatRequest;
    const message = normalizeText(body?.message);
    const selectedPostId = normalizeText(body?.selectedPostId);

    if (!message) {
      return NextResponse.json({ success: false, error: "message is required" }, { status: 400 });
    }

    if (!selectedPostId) {
      return NextResponse.json(
        { success: false, error: "selectedPostId is required" },
        { status: 400 },
      );
    }

    const db = getAdminDb();

    const postDoc = await db.collection("posts").doc(selectedPostId).get();
    if (!postDoc.exists) {
      return NextResponse.json({ success: false, error: "post not found" }, { status: 404 });
    }

    const postData = postDoc.data() as Record<string, unknown>;
    if (normalizeText(postData.userId) !== uid) {
      return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
    }

    const analyticsSnapshot = await db
      .collection("analytics")
      .where("userId", "==", uid)
      .where("postId", "==", selectedPostId)
      .get();

    if (analyticsSnapshot.empty) {
      return NextResponse.json(
        {
          success: true,
          data: {
            reply:
              "根拠データ\nこの投稿には保存済み分析データがありません。\n\n解釈\n未保存データは参照しない仕様のため、分析チャットでは回答できない状態です。\n\n次の1アクション\n先に分析ページで数値を保存してから、再度質問してください。",
            suggestedQuestions: ["何を先に保存すればいい？"],
          },
        },
        { status: 200 },
      );
    }

    const latestAnalyticsDoc = analyticsSnapshot.docs
      .map((doc) => ({
        data: doc.data() as AnalyticsDoc,
        createdAt: toDate((doc.data() as AnalyticsDoc).createdAt)?.getTime() || 0,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)[0]?.data;

    if (!latestAnalyticsDoc) {
      return NextResponse.json(
        { success: false, error: "analytics data is unavailable" },
        { status: 500 },
      );
    }

    const postTypeRaw = normalizeText(postData.postType || latestAnalyticsDoc.category || "feed");
    const postType: "feed" | "reel" | "story" =
      postTypeRaw === "reel" ? "reel" : postTypeRaw === "story" ? "story" : "feed";

    const title = normalizeText(postData.title);

    const result = buildSummary({
      postType,
      title,
      analytics: latestAnalyticsDoc,
      message,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("instagram posts advisor chat error:", error);
    return NextResponse.json(
      { success: false, error: "チャット応答の生成に失敗しました" },
      { status: 500 },
    );
  }
}
