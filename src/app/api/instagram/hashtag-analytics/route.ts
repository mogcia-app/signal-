import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    console.log("🔍 ハッシュタグ分析API呼び出し:", { userId });

    // 投稿データを取得
    const postsSnapshot = await adminDb
      .collection("posts")
      .where("userId", "==", userId)
      .where("status", "==", "published")
      .get();
    const posts = postsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{
      id: string;
      userId: string;
      title: string;
      content: string;
      hashtags: string[];
      postType: "feed" | "reel" | "story";
      scheduledDate?: string;
      scheduledTime?: string;
      status: "draft" | "scheduled" | "published";
      imageUrl?: string | null;
      imageData?: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;

    // ハッシュタグの使用回数を計算（シンプル版）
    const hashtagStats: Record<string, number> = {};

    // 投稿データからハッシュタグを収集
    posts.forEach((post) => {
      if (post.hashtags && Array.isArray(post.hashtags)) {
        post.hashtags.forEach((hashtag: string) => {
          hashtagStats[hashtag] = (hashtagStats[hashtag] || 0) + 1;
        });
      }
    });

    // ハッシュタグランキングを生成（使用回数のみ）
    const hashtagRanking = Object.entries(hashtagStats)
      .map(([tag, count]) => ({
        tag: `#${tag}`,
        count: count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 上位10件

    console.log("✅ ハッシュタグ分析完了:", {
      totalHashtags: Object.keys(hashtagStats).length,
      topHashtags: hashtagRanking.length,
    });

    return NextResponse.json({
      success: true,
      data: hashtagRanking,
      summary: {
        totalHashtags: Object.keys(hashtagStats).length,
        totalPosts: posts.length,
      },
    });
  } catch (error) {
    console.error("❌ ハッシュタグ分析エラー:", error);
    return NextResponse.json(
      {
        error: "ハッシュタグ分析に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
