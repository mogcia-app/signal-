import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import * as admin from "firebase-admin";
import { requireAuthContext } from "@/lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import { deletePostImageByUrl, uploadPostImageDataUrl } from "@/lib/server/post-image-storage";
import type { WriteResult } from "firebase-admin/firestore";

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

    const docRef = adminDb.collection("posts").doc(postId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "投稿が見つかりません" }, { status: 404 });
    }

    const postData = {
      id: docSnap.id,
      ...(docSnap.data()
        ? (() => {
            const { imageData: _imageData, ...rest } = docSnap.data() as Record<string, unknown>;
            return rest;
          })()
        : {}),
      createdAt: docSnap.data()?.createdAt?.toDate?.() || docSnap.data()?.createdAt,
      updatedAt: docSnap.data()?.updatedAt?.toDate?.() || docSnap.data()?.updatedAt,
    };

    console.log("Post retrieved successfully:", postId);
    return NextResponse.json({ post: postData });
  } catch (error) {
    console.error("=== POST GET ERROR ===");
    console.error("Error details:", error);
    return NextResponse.json({ error: "投稿の取得に失敗しました" }, { status: 500 });
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

    const docRef = adminDb.collection("posts").doc(postId);
    const currentDoc = await docRef.get();
    const currentData = currentDoc.exists ? currentDoc.data() : null;
    const currentImageUrl = typeof currentData?.imageUrl === "string" ? currentData.imageUrl : "";

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    let uploadedImageUrl: string | null = null;

    // 更新するフィールドのみ追加
    if (title !== undefined) {updateData.title = title;}
    if (content !== undefined) {updateData.content = content;}
    if (hashtags !== undefined) {updateData.hashtags = hashtags;}
    if (postType !== undefined) {updateData.postType = postType;}
    if (scheduledDate !== undefined) {updateData.scheduledDate = scheduledDate;}
    if (scheduledTime !== undefined) {updateData.scheduledTime = scheduledTime;}
    if (status !== undefined) {updateData.status = status;}
    if (imageUrl !== undefined) {updateData.imageUrl = imageUrl;}
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
          updateData.imageUrl = uploadedImageUrl;
        } catch (uploadError) {
          console.error("投稿画像アップロードエラー:", uploadError);
          return NextResponse.json(
            { error: "画像アップロードに失敗しました", code: "IMAGE_UPLOAD_FAILED" },
            { status: 500 }
          );
        }
      } else if (!normalizedImageData) {
        updateData.imageUrl = null;
      }
      updateData.imageData = null;
    }
    if (analytics !== undefined) {updateData.analytics = analytics;}

    await docRef.update(updateData);
    if (uploadedImageUrl && currentImageUrl && currentImageUrl !== uploadedImageUrl) {
      await deletePostImageByUrl(currentImageUrl);
    } else if (imageData !== undefined && !body.imageData && currentImageUrl) {
      await deletePostImageByUrl(currentImageUrl);
    }

    // scheduledDateまたはscheduledTimeが変更された場合、対応するanalyticsコレクションのpublishedAtも更新
    if (scheduledDate !== undefined || scheduledTime !== undefined) {
      try {
        // 該当するanalyticsデータを取得
        const analyticsSnapshot = await adminDb
          .collection("analytics")
          .where("userId", "==", uid)
          .where("postId", "==", postId)
          .get();

        if (!analyticsSnapshot.empty) {
          // 投稿データを取得してscheduledDateとscheduledTimeを確認
          const postDoc = await docRef.get();
          const postData = postDoc.data();
          
          // 更新後のscheduledDateとscheduledTimeを取得
          const finalScheduledDate = scheduledDate !== undefined ? scheduledDate : postData?.scheduledDate;
          const finalScheduledTime = scheduledTime !== undefined ? scheduledTime : postData?.scheduledTime;

          if (finalScheduledDate) {
            // scheduledDateとscheduledTimeからpublishedAtを計算
            let publishedAtDate: Date;
            if (finalScheduledDate instanceof Date) {
              publishedAtDate = new Date(finalScheduledDate);
            } else if (typeof finalScheduledDate === "string") {
              publishedAtDate = new Date(finalScheduledDate);
            } else {
              publishedAtDate = new Date();
            }

            // scheduledTimeがある場合、時刻を設定
            if (finalScheduledTime && typeof finalScheduledTime === "string") {
              const [hours, minutes] = finalScheduledTime.split(":").map(Number);
              if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
                publishedAtDate.setHours(hours, minutes, 0, 0);
              }
            }

            // すべてのanalyticsドキュメントを更新
            const batch = adminDb.batch();
            analyticsSnapshot.docs.forEach((analyticsDoc) => {
              batch.update(analyticsDoc.ref, {
                publishedAt: admin.firestore.Timestamp.fromDate(publishedAtDate),
                publishedTime: finalScheduledTime || publishedAtDate.toTimeString().slice(0, 5),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            });
            await batch.commit();
            console.log(`Updated publishedAt for ${analyticsSnapshot.size} analytics records for post ${postId}`);
          }
        }
      } catch (analyticsUpdateError) {
        console.error("Analytics publishedAt update error:", analyticsUpdateError);
        // analytics更新に失敗しても投稿更新は成功しているので続行
      }
    }

    console.log("Post updated successfully:", postId);
    return NextResponse.json({
      message: "投稿が更新されました",
      id: postId,
    });
  } catch (error) {
    console.error("=== POST UPDATE ERROR ===");
    console.error("Error details:", error);
    return NextResponse.json({ error: "投稿の更新に失敗しました" }, { status: 500 });
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

    // 投稿の存在確認
    const docRef = adminDb.collection("posts").doc(postId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log("Post not found:", postId);
      return NextResponse.json({ error: "投稿が見つかりません" }, { status: 404 });
    }

    const postData = docSnap.data();

    // 投稿を削除
    await docRef.delete();

    // 投稿に紐づくデータを削除（analytics、フィードバック、アクションログ）
    try {
      const cleanupTasks: Array<Promise<WriteResult[] | void>> = [];

      // analyticsコレクションから削除（postIdで紐づく分析データ）
      if (postData?.userId) {
        const analyticsSnapshot = await adminDb
          .collection("analytics")
          .where("userId", "==", postData.userId)
          .where("postId", "==", postId)
          .get();

        if (!analyticsSnapshot.empty) {
          const batch = adminDb.batch();
          analyticsSnapshot.forEach((analyticsDoc) => batch.delete(analyticsDoc.ref));
          cleanupTasks.push(batch.commit());
          console.log(`Deleted ${analyticsSnapshot.size} analytics records for post ${postId}`);
        }
      }

      // ai_post_feedback の削除
      const feedbackSnapshot = await adminDb
        .collection("ai_post_feedback")
        .where("postId", "==", postId)
        .get();

      if (!feedbackSnapshot.empty) {
        const batch = adminDb.batch();
        feedbackSnapshot.forEach((feedbackDoc) => batch.delete(feedbackDoc.ref));
        cleanupTasks.push(batch.commit());
        console.log(`Deleted ${feedbackSnapshot.size} feedback records for post ${postId}`);
      }

      // ai_action_logs の削除（フォーカスエリアに postId を含むエントリ）
      if (postData?.userId) {
        const actionSnapshot = await adminDb
          .collection("ai_action_logs")
          .where("userId", "==", postData.userId)
          .where("focusArea", "==", `learning-${postId}`)
          .get();

        if (!actionSnapshot.empty) {
          const batch = adminDb.batch();
          actionSnapshot.forEach((actionDoc) => batch.delete(actionDoc.ref));
          cleanupTasks.push(batch.commit());
          console.log(`Deleted ${actionSnapshot.size} action logs for post ${postId}`);
        }
      }

      await Promise.all(cleanupTasks);
    } catch (cleanupError) {
      console.error("⚠️ Cleanup error after post deletion:", cleanupError);
    }

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

    return NextResponse.json(
      {
        success: false,
        error: "投稿の削除に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
