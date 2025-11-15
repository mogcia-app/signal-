import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import type { WriteResult } from "firebase-admin/firestore";

// 特定の投稿取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
      ...docSnap.data(),
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

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // 更新するフィールドのみ追加
    if (title !== undefined) {updateData.title = title;}
    if (content !== undefined) {updateData.content = content;}
    if (hashtags !== undefined) {updateData.hashtags = hashtags;}
    if (postType !== undefined) {updateData.postType = postType;}
    if (scheduledDate !== undefined) {updateData.scheduledDate = scheduledDate;}
    if (scheduledTime !== undefined) {updateData.scheduledTime = scheduledTime;}
    if (status !== undefined) {updateData.status = status;}
    if (imageUrl !== undefined) {updateData.imageUrl = imageUrl;}
    if (imageData !== undefined) {updateData.imageData = imageData;}
    if (analytics !== undefined) {updateData.analytics = analytics;}

    const docRef = adminDb.collection("posts").doc(postId);
    await docRef.update(updateData);

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

    // 投稿に紐づくフィードバックとアクションログを削除
    try {
      const cleanupTasks: Array<Promise<WriteResult[] | void>> = [];

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
