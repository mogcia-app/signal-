import { NextRequest, NextResponse } from "next/server";

import { getAdminDb } from "../../../../lib/firebase-admin";
import { requireAuthContext } from "../../../../lib/server/auth-context";

export async function DELETE(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-delete-by-post", limit: 10, windowSeconds: 60 },
      auditEventName: "analytics_delete_by_post",
    });

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "postId is required" },
        { status: 400 },
      );
    }

    const db = getAdminDb();

    const analyticsSnapshot = await db
      .collection("analytics")
      .where("userId", "==", uid)
      .where("postId", "==", postId)
      .get();

    if (analyticsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: "No analytics records found for the given postId",
      });
    }

    const batch = db.batch();
    analyticsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({
      success: true,
      deletedCount: analyticsSnapshot.size,
    });
  } catch (error) {
    console.error("Failed to delete analytics by postId:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete analytics by postId",
      },
      { status: 500 },
    );
  }
}

