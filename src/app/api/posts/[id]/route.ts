import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { deletePostImageByUrl, uploadPostImageDataUrl } from "@/lib/server/post-image-storage";
import { PostRepository } from "@/repositories/post-repository";

// Keep payload safely below serverless request size limits in production.
const MAX_IMAGE_DATA_BYTES = 3_000_000;

// 特定の投稿取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
    });

    // プラン階層別アクセス制御: 梅プランでは投稿詳細取得にアクセスできない
    const userProfile = await getUserProfile(uid);
    if (!canAccessFeature(userProfile, "canAccessPosts")) {
      return NextResponse.json(
        { error: "投稿管理機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const postId = resolvedParams.id;

    console.log("=== POST GET REQUEST ===");
    console.log("Post ID:", postId);

    const post = await PostRepository.getById(uid, postId);
    if (!post) {
      return NextResponse.json({ error: "投稿が見つかりません" }, { status: 404 });
    }

    console.log("Post retrieved successfully:", postId);
    return NextResponse.json({ post });
  } catch (error) {
    console.error("=== POST GET ERROR ===");
    console.error("Error details:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// 投稿更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
    });

    // プラン階層別アクセス制御: 梅プランでは投稿更新にアクセスできない
    const userProfile = await getUserProfile(uid);
    if (!canAccessFeature(userProfile, "canAccessPosts")) {
      return NextResponse.json(
        { error: "投稿管理機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const postId = resolvedParams.id;
    const body = await request.json();
    const {
      title,
      content,
      hashtags,
      postType,
      scheduledDate,
      scheduledTime,
      status,
      imageUrl,
      imageData,
      analytics,
    } = body;

    console.log("=== POST UPDATE REQUEST ===");
    console.log("Post ID:", postId);
    console.log("Update data:", { title, content, hashtags, postType, status });

    let uploadedImageUrl: string | null = null;
    const updates: Record<string, unknown> = {};

    // 更新するフィールドのみ追加
    if (title !== undefined) {updates.title = title;}
    if (content !== undefined) {updates.content = content;}
    if (hashtags !== undefined) {updates.hashtags = hashtags;}
    if (postType !== undefined) {updates.postType = postType;}
    if (scheduledDate !== undefined) {updates.scheduledDate = scheduledDate;}
    if (scheduledTime !== undefined) {updates.scheduledTime = scheduledTime;}
    if (status !== undefined) {updates.status = status;}
    if (imageUrl !== undefined) {updates.imageUrl = imageUrl;}
    if (imageData !== undefined) {
      const normalizedImageData = typeof imageData === "string" ? imageData.trim() : imageData;
      if (typeof normalizedImageData === "string" && normalizedImageData.length > 0) {
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
            userId: uid,
            imageDataUrl: normalizedImageData,
          });
          uploadedImageUrl = uploaded.imageUrl;
          updates.imageUrl = uploadedImageUrl;
        } catch (uploadError) {
          console.error("投稿画像アップロードエラー:", uploadError);
          return NextResponse.json(
            { error: "画像アップロードに失敗しました", code: "IMAGE_UPLOAD_FAILED" },
            { status: 500 }
          );
        }
      } else if (!normalizedImageData) {
        updates.imageUrl = null;
      }
      updates.imageData = null;
    }
    if (analytics !== undefined) {updates.analytics = analytics;}

    const { previousImageUrl } = await PostRepository.updateById({
      userId: uid,
      postId,
      updates,
    });
    if (uploadedImageUrl && previousImageUrl && previousImageUrl !== uploadedImageUrl) {
      await deletePostImageByUrl(previousImageUrl);
    } else if (imageData !== undefined && !body.imageData && previousImageUrl) {
      await deletePostImageByUrl(previousImageUrl);
    }

    console.log("Post updated successfully:", postId);
    return NextResponse.json({
      message: "投稿が更新されました",
      id: postId,
    });
  } catch (error) {
    console.error("=== POST UPDATE ERROR ===");
    console.error("Error details:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

// 投稿削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
    });

    // プラン階層別アクセス制御: 梅プランでは投稿削除にアクセスできない
    const userProfile = await getUserProfile(uid);
    if (!canAccessFeature(userProfile, "canAccessPosts")) {
      return NextResponse.json(
        { error: "投稿管理機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const postId = resolvedParams.id;

    console.log("=== POST DELETE REQUEST ===");
    console.log("Post ID:", postId);

    await PostRepository.deleteById({ userId: uid, postId });

    console.log("Post deleted successfully:", postId);
    return NextResponse.json({
      success: true,
      message: "投稿が削除されました",
      id: postId,
    });
  } catch (error) {
    console.error("=== POST DELETE ERROR ===");
    console.error("Error details:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
