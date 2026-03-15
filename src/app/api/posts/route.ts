import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { uploadPostImageDataUrl } from "@/lib/server/post-image-storage";
import { PostRepository } from "@/repositories/post-repository";

// Keep payload safely below serverless request size limits in production.
const MAX_IMAGE_DATA_BYTES = 3_000_000;

// 投稿作成
export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "posts-create", limit: 30, windowSeconds: 60 },
      auditEventName: "posts_create",
    });

    const body = await request.json();
    console.log("POST /api/posts - Received data:", body);
    const {
      title,
      content,
      hashtags,
      postType,
      scheduledDate,
      scheduledTime,
      status = "draft",
      imageUrl,
      imageData,
      analytics,
      snapshotReferences,
      generationReferences,
    } = body;

    // 投稿タイプのデバッグログ
    console.log("投稿タイプデバッグ:", {
      postType: postType,
      title: title,
      userId: userId,
    });

    // バリデーション
    if (!title || !content) {
      return NextResponse.json({ error: "必須フィールドが不足しています" }, { status: 400 });
    }

    const normalizedImageData = typeof imageData === "string" ? imageData.trim() : "";
    let uploadedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
    if (normalizedImageData) {
      const imageDataBytes = Buffer.byteLength(normalizedImageData, "utf8");
      if (imageDataBytes > MAX_IMAGE_DATA_BYTES) {
        return NextResponse.json(
          {
            error: "画像サイズが大きすぎます。画像を小さくして再度保存してください。",
            code: "IMAGE_DATA_TOO_LARGE",
            maxBytes: MAX_IMAGE_DATA_BYTES,
          },
          { status: 413 }
        );
      }
      if (!normalizedImageData.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "画像データ形式が不正です", code: "INVALID_IMAGE_DATA_URL" },
          { status: 400 }
        );
      }

      try {
        const uploaded = await uploadPostImageDataUrl({
          userId,
          imageDataUrl: normalizedImageData,
        });
        uploadedImageUrl = uploaded.imageUrl;
      } catch (uploadError) {
        console.error("投稿画像アップロードエラー:", uploadError);
        return NextResponse.json(
          { error: "画像アップロードに失敗しました", code: "IMAGE_UPLOAD_FAILED" },
          { status: 500 }
        );
      }
    }

    const postData = {
      userId,
      title,
      content,
      hashtags: hashtags || [],
      postType: postType || "feed",
      scheduledDate: scheduledDate || null,
      scheduledTime: scheduledTime || null,
      status,
      imageUrl: uploadedImageUrl || null,
      analytics: analytics || null,
      snapshotReferences: Array.isArray(snapshotReferences) ? snapshotReferences : [],
      generationReferences: Array.isArray(generationReferences)
        ? generationReferences.slice(0, 8)
        : [],
    };

    const createdPost = await PostRepository.create(postData);

    // デバッグ用ログ
    console.log("Post created successfully:", {
      id: createdPost.id,
      status: createdPost.status,
      title: createdPost.title,
      userId: createdPost.userId,
    });

    // 通知機能は削除されました

    return NextResponse.json({
      id: createdPost.id,
      message: "投稿が保存されました",
      data: createdPost,
    });
  } catch (error) {
    console.error("投稿作成エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// 投稿一覧取得
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "posts-list", limit: 60, windowSeconds: 60 },
      auditEventName: "posts_list",
    });

    // プラン階層別アクセス制御: 梅プランでは投稿一覧にアクセスできない
    const userProfile = await getUserProfile(uid);
    if (!canAccessFeature(userProfile, "canAccessPosts")) {
      return NextResponse.json(
        { error: "投稿一覧機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }
    console.log("=== POSTS API GET REQUEST ===");
    console.log("Request URL:", request.url);
    console.log("Request method:", request.method);
    console.log("Request headers:", Object.fromEntries(request.headers.entries()));

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? uid;
    const status = searchParams.get("status");
    const postType = searchParams.get("postType");
    const limit = parseInt(searchParams.get("limit") || "50");

    console.log("Query parameters:", { userId, status, postType, limit });

    // 本番環境でFirebase設定がない場合は空の配列を返す
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.log("Firebase API key not found in production, returning empty posts");
      return NextResponse.json({
        posts: [],
        total: 0,
      });
    }

    console.log("Firebase API key found, proceeding with database query");
    console.log("Query parameters:", { userId, status, postType, limit });

    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    if (userId !== uid) {
      return NextResponse.json({ error: "別ユーザーの投稿にはアクセスできません" }, { status: 403 });
    }

    const result = await PostRepository.list({
      userId,
      status,
      postType,
      limit,
    });

    console.log("Fetched posts from collection:", result.posts.length, "records");
    console.log("Posts query result sample:", result.posts.slice(0, 2));

    console.log("Returning response:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("=== POSTS API ERROR ===");
    console.error("Error details:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
