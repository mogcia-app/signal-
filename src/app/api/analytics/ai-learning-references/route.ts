import { NextRequest, NextResponse } from "next/server";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import { buildAIContext } from "@/lib/ai/context";

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-ai-learning-references", limit: 30, windowSeconds: 60 },
      auditEventName: "analytics_ai_learning_references_access",
    });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 7); // YYYY-MM形式

    if (!/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date parameter must be in YYYY-MM format" },
        { status: 400 }
      );
    }

    // AIコンテキストを構築（既存のmonthly-report-summaryと同じロジックを使用）
    const aiContextBundle = await buildAIContext(uid, {
      includeUserProfile: true,
      includePlan: true,
      includeSnapshots: true,
      includeMasterContext: true,
      includeActionLogs: false,
      includeAbTests: false,
      snapshotLimit: 10,
    });

    // 月の範囲を計算（スナップショットを期間でフィルタリング）
    // start and end removed (unused, filtering is done by date comparison in snapshot references)

    // 期間内のスナップショットのみをフィルタリングし、重複を排除
    // 同じ投稿IDのスナップショットは1つだけを保持（最初に見つかったもの）
    const seenPostIds = new Set<string>();
    const filteredSnapshotRefs = aiContextBundle.snapshotReferences
      .filter((ref) => {
        const postId = ref.postId;
        if (postId) {
          // 同じ投稿IDのスナップショットが既にある場合はスキップ
          if (seenPostIds.has(postId)) {
            return false;
          }
          seenPostIds.add(postId);
        }
        return true;
      })
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      data: {
        masterContext: aiContextBundle.masterContext || null,
        references: aiContextBundle.references || [],
        snapshotReferences: filteredSnapshotRefs,
        month: date,
      },
    });
  } catch (error) {
    console.error("❌ AI学習リファレンス取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "AI学習リファレンスの取得に失敗しました",
      },
      { status }
    );
  }
}

