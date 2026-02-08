import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";
import { fetchAIDirection } from "@/lib/ai/context";

/**
 * GET: ai_directionを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "ai-direction-get", limit: 30, windowSeconds: 60 },
      auditEventName: "ai_direction_get",
    });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (month) {
      // 特定の月のai_directionを取得
      const directionDoc = await adminDb
        .collection("ai_direction")
        .doc(`${uid}_${month}`)
        .get();

      if (!directionDoc.exists) {
        return NextResponse.json({
          success: true,
          data: null,
        });
      }

      const data = directionDoc.data();
      return NextResponse.json({
        success: true,
        data: {
          userId: data?.userId,
          month: data?.month,
          mainTheme: data?.mainTheme || "",
          avoidFocus: Array.isArray(data?.avoidFocus) ? data.avoidFocus : [],
          priorityKPI: data?.priorityKPI || "",
          postingRules: Array.isArray(data?.postingRules) ? data.postingRules : [],
          generatedFrom: data?.generatedFrom || "monthly_review",
          lockedAt: data?.lockedAt?.toDate?.()?.toISOString() ?? null,
          createdAt: data?.createdAt?.toDate?.()?.toISOString() ?? null,
          updatedAt: data?.updatedAt?.toDate?.()?.toISOString() ?? null,
        },
      });
    } else {
      // 最新のai_directionを取得
      const aiDirection = await fetchAIDirection(uid);
      return NextResponse.json({
        success: true,
        data: aiDirection,
      });
    }
  } catch (error) {
    console.error("❌ ai_direction取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * POST: ai_directionを確定（lockedAtを設定）
 */
export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "ai-direction-post", limit: 10, windowSeconds: 60 },
      auditEventName: "ai_direction_lock",
    });

    const body = await request.json();
    const { month, create, mainTheme, priorityKPI, avoidFocus, postingRules, locked } = body;

    if (!month) {
      return NextResponse.json(
        { success: false, error: "monthは必須です" },
        { status: 400 }
      );
    }

    const directionDocRef = adminDb.collection("ai_direction").doc(`${uid}_${month}`);
    const directionDoc = await directionDocRef.get();

    // 作成フラグが立っている場合、ai_directionを作成
    if (create) {
      const directionData: {
        userId: string;
        month: string;
        mainTheme: string;
        avoidFocus: string[];
        priorityKPI: string;
        postingRules: string[];
        optimalPostingTime?: string | null;
        generatedFrom: string;
        lockedAt: admin.firestore.FieldValue | null;
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
      } = {
        userId: uid,
        month: month,
        mainTheme: mainTheme || "継続的な改善",
        avoidFocus: Array.isArray(avoidFocus) ? avoidFocus : [],
        priorityKPI: priorityKPI || "エンゲージメント率",
        postingRules: Array.isArray(postingRules) ? postingRules : [],
        optimalPostingTime: null, // 手動作成時はnull（月次レポート生成時に自動計算される）
        generatedFrom: "manual",
        lockedAt: locked ? admin.firestore.FieldValue.serverTimestamp() : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await directionDocRef.set(directionData, { merge: true });
      
      console.log(`✅ ai_directionを作成${locked ? "・確定" : ""}: ${uid}_${month} - ${mainTheme}`);
      
      return NextResponse.json({
        success: true,
        message: locked ? "ai_directionを作成して確定しました" : "ai_directionを作成しました",
      });
    }

    if (!directionDoc.exists) {
      return NextResponse.json(
        { success: false, error: "ai_directionが見つかりません" },
        { status: 404 }
      );
    }

    // lockedAtを設定（確定）
    if (locked) {
      await directionDocRef.update({
        lockedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`✅ ai_directionを確定: ${uid}_${month}`);

    return NextResponse.json({
      success: true,
      message: "ai_directionを確定しました",
    });
  } catch (error) {
    console.error("❌ ai_direction確定エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

