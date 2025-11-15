import { NextRequest, NextResponse } from "next/server";

import { generatePostPerformanceSnapshots } from "../../../../lib/analytics/snapshot-generator";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import {
  fetchAbTestSummaries,
  mapAbTestResultsByPost,
} from "@/lib/analytics/ab-test-utils";

type RawSnapshotDoc = {
  id: string;
  status?: string;
  postId?: string | null;
  source?: {
    postId?: string | null;
  };
  [key: string]: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-snapshots-generate", limit: 5, windowSeconds: 60 },
      auditEventName: "analytics_snapshots_generate",
    });

    const body = await request.json().catch(() => ({}));
    const windowDays =
      typeof body?.windowDays === "number" && body.windowDays > 0 ? body.windowDays : undefined;
    const dryRun = Boolean(body?.dryRun);

    const result = await generatePostPerformanceSnapshots(uid, { windowDays, dryRun });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[analytics/snapshots] generation error", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-snapshots-fetch", limit: 60, windowSeconds: 60 },
      auditEventName: "analytics_snapshots_fetch",
    });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    const snapshotRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("postPerformanceSnapshots")
      .orderBy("createdAt", "desc")
      .limit(limit);

    const [snapshotDocs, abTestSummaries] = await Promise.all([
      snapshotRef.get(),
      fetchAbTestSummaries(uid, 10),
    ]);
    const abTestResultsByPost = mapAbTestResultsByPost(abTestSummaries);

    let snapshots: RawSnapshotDoc[] = snapshotDocs.docs.map((doc) => {
      const data = doc.data();
      const postId = data.postId || data.source?.postId || null;
      return {
        id: doc.id,
        ...data,
        status: data.status ?? "normal",
        postId,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        publishedAt: data.publishedAt?.toDate?.()
          ? data.publishedAt.toDate().toISOString()
          : data.publishedAt,
      };
    });

    if (statusFilter) {
      snapshots = snapshots.filter((snapshot) => snapshot.status === statusFilter);
    }

    snapshots = snapshots.map((snapshot) => {
      const postId = snapshot.postId || snapshot.source?.postId || null;
      if (postId) {
        const abResults = abTestResultsByPost.get(postId);
        if (abResults && abResults.length > 0) {
          return {
            ...snapshot,
            abTestResults: abResults,
          };
        }
      }
      return snapshot;
    });

    return NextResponse.json({
      success: true,
      count: snapshots.length,
      snapshots,
    });
  } catch (error) {
    console.error("[analytics/snapshots] fetch error", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

