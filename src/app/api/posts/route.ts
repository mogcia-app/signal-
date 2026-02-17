import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { uploadPostImageDataUrl } from "@/lib/server/post-image-storage";
import type { AIReference } from "@/types/ai";
import type { SnapshotReference as BaseSnapshotReference } from "@/types/ai";

// 投稿データの型定義
type SnapshotReference = Omit<BaseSnapshotReference, "score" | "summary"> & {
  score?: number;
  summary?: string;
};

interface PostData {
  id?: string;
  userId: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: "feed" | "reel" | "story";
  scheduledDate?: string;
  scheduledTime?: string;
  status: "draft" | "scheduled" | "published";
  imageUrl?: string | null;
  analytics?: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    engagementRate: number;
    publishedAt: Date;
  };
  snapshotReferences?: SnapshotReference[];
  generationReferences?: AIReference[];
  createdAt: Date;
  updatedAt: Date;
}

const MAX_IMAGE_DATA_BYTES = 8_000_000;

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

    const postData: Omit<PostData, "id"> = {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("About to save to Firestore:", postData);
    console.log("保存される投稿タイプ:", postData.postType);
    const docRef = await adminDb.collection("posts").add(postData);

    // デバッグ用ログ
    console.log("Post created successfully:", {
      id: docRef.id,
      status: postData.status,
      title: postData.title,
      userId: postData.userId,
    });

    // 通知機能は削除されました

    return NextResponse.json({
      id: docRef.id,
      message: "投稿が保存されました",
      data: { ...postData, id: docRef.id },
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

    // Admin SDKでクエリ構築
    let queryRef: FirebaseFirestore.Query = adminDb.collection("posts");

    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    if (userId !== uid) {
      return NextResponse.json({ error: "別ユーザーの投稿にはアクセスできません" }, { status: 403 });
    }

    console.log("Filtering posts by userId:", userId);
    queryRef = queryRef.where("userId", "==", userId);
    if (status) {
      console.log("Filtering posts by status:", status);
      queryRef = queryRef.where("status", "==", status);
    }
    if (postType) {
      console.log("Filtering posts by postType:", postType);
      queryRef = queryRef.where("postType", "==", postType);
    }

    const snapshot = await queryRef.get();
    const posts = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const { imageData: _imageData, ...rest } = data;
        // 取得した投稿タイプのデバッグログ
        console.log("取得した投稿タイプデバッグ:", {
          postId: doc.id,
          postType: data.postType,
          title: data.title,
        });
        return {
          id: doc.id,
          ...rest,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        };
      })
      .sort((a, b) => {
        const aTime =
          a.createdAt instanceof Date
            ? a.createdAt.getTime()
            : new Date(a.createdAt as string).getTime();
        const bTime =
          b.createdAt instanceof Date
            ? b.createdAt.getTime()
            : new Date(b.createdAt as string).getTime();
        return bTime - aTime;
      })
      .slice(0, limit);

    console.log("Fetched posts from collection:", posts.length, "records");
    console.log("Posts query result sample:", posts.slice(0, 2));

    const response = {
      posts,
      total: snapshot.size,
    };

    console.log("Returning response:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("=== POSTS API ERROR ===");
    console.error("Error details:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
