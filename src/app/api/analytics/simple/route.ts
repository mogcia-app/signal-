import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { syncPlanFollowerProgress } from "../../../../lib/plans/sync-follower-progress";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-simple-get", limit: 60, windowSeconds: 60 },
      auditEventName: "analytics_simple_get",
    });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? uid;

    if (userId !== uid) {
      return NextResponse.json(
        { success: false, error: "Forbidden: access to another user's analytics is not allowed." },
        { status: 403 },
      );
    }

    const querySnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .orderBy("publishedAt", "desc")
      .get();

    const analyticsData = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate?.()?.toISOString() ?? data.publishedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-simple-post", limit: 20, windowSeconds: 60 },
      auditEventName: "analytics_simple_post",
    });

    const body = await request.json();

    const {
      userId: bodyUserId,
      postId,
      likes,
      comments,
      shares,
      reposts,
      reach,
      saves,
      followerIncrease,
      publishedAt,
      publishedTime,
      title,
      content,
      hashtags,
      thumbnail,
      category,
      reachFollowerPercent,
      interactionCount,
      interactionFollowerPercent,
      reachSourceProfile,
      reachSourceFeed,
      reachSourceExplore,
      reachSourceSearch,
      reachSourceOther,
      reachedAccounts,
      profileVisits,
      profileFollows,
      reelReachFollowerPercent,
      reelInteractionCount,
      reelInteractionFollowerPercent,
      reelReachSourceProfile,
      reelReachSourceReel,
      reelReachSourceExplore,
      reelReachSourceSearch,
      reelReachSourceOther,
      reelReachedAccounts,
      reelSkipRate,
      reelNormalSkipRate,
      reelPlayTime,
      reelAvgPlayTime,
      audience,
      reachSource,
      commentThreads,
      sentiment,
      sentimentMemo,
    } = body;

    const resolvedUserId = bodyUserId ?? uid;
    if (resolvedUserId !== uid) {
      return NextResponse.json(
        { success: false, error: "Forbidden: cannot create analytics for another user." },
        { status: 403 },
      );
    }

    const now = new Date();
    const analyticsData = {
      userId: uid,
      postId: postId || null,
      snsType: "instagram",
      postType: category || "feed",
      likes: Number.parseInt(likes) || 0,
      comments: Number.parseInt(comments) || 0,
      shares: Number.parseInt(shares) || 0,
      reposts: Number.parseInt(reposts) || 0,
      reach: Number.parseInt(reach) || 0,
      saves: Number.parseInt(saves) || 0,
      followerIncrease: Number.parseInt(followerIncrease) || 0,
      engagementRate: 0,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      publishedTime: publishedTime || "",
      title: title || "",
      content: content || "",
      hashtags: hashtags || [],
      thumbnail: thumbnail || "",
      category: category || "feed",
      reachFollowerPercent: Number.parseFloat(reachFollowerPercent) || 0,
      interactionCount: Number.parseInt(interactionCount) || 0,
      interactionFollowerPercent: Number.parseFloat(interactionFollowerPercent) || 0,
      reachSourceProfile: Number.parseInt(reachSourceProfile) || 0,
      reachSourceFeed: Number.parseInt(reachSourceFeed) || 0,
      reachSourceExplore: Number.parseInt(reachSourceExplore) || 0,
      reachSourceSearch: Number.parseInt(reachSourceSearch) || 0,
      reachSourceOther: Number.parseInt(reachSourceOther) || 0,
      reachedAccounts: Number.parseInt(reachedAccounts) || 0,
      profileVisits: Number.parseInt(profileVisits) || 0,
      profileFollows: Number.parseInt(profileFollows) || 0,
      reelReachFollowerPercent: Number.parseFloat(reelReachFollowerPercent) || 0,
      reelInteractionCount: Number.parseInt(reelInteractionCount) || 0,
      reelInteractionFollowerPercent: Number.parseFloat(reelInteractionFollowerPercent) || 0,
      reelReachSourceProfile: Number.parseInt(reelReachSourceProfile) || 0,
      reelReachSourceReel: Number.parseInt(reelReachSourceReel) || 0,
      reelReachSourceExplore: Number.parseInt(reelReachSourceExplore) || 0,
      reelReachSourceSearch: Number.parseInt(reelReachSourceSearch) || 0,
      reelReachSourceOther: Number.parseInt(reelReachSourceOther) || 0,
      reelReachedAccounts: Number.parseInt(reelReachedAccounts) || 0,
      reelSkipRate: Number.parseFloat(reelSkipRate) || 0,
      reelNormalSkipRate: Number.parseFloat(reelNormalSkipRate) || 0,
      reelPlayTime: Number.parseInt(reelPlayTime) || 0,
      reelAvgPlayTime: Number.parseFloat(reelAvgPlayTime) || 0,
      audience: audience || null,
      reachSource: reachSource || null,
      commentThreads: Array.isArray(commentThreads)
        ? commentThreads
            .map((thread: any) => ({
              comment: typeof thread?.comment === "string" ? thread.comment.trim() : "",
              reply: typeof thread?.reply === "string" ? thread.reply.trim() : "",
            }))
            .filter((thread) => thread.comment || thread.reply)
        : [],
      sentiment: sentiment || null,
      sentimentMemo: sentimentMemo || "",
      createdAt: now,
      updatedAt: now,
    };

    const analyticsCollection = adminDb.collection("analytics");

    if (analyticsData.postId) {
      const existingSnapshot = await analyticsCollection
        .where("userId", "==", uid)
        .where("postId", "==", analyticsData.postId)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();
        await existingDoc.ref.update({
          ...analyticsData,
          createdAt: existingData.createdAt ?? now,
        });
        await syncPlanFollowerProgress(uid);

        return NextResponse.json({
          success: true,
          id: existingDoc.id,
          message: "Analytics data updated successfully",
        });
      }
    }

    const docRef = await analyticsCollection.add(analyticsData);
    await syncPlanFollowerProgress(uid);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: "Analytics data saved successfully",
    });
  } catch (error) {
    console.error("Analytics save error:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}


