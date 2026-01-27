import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { logger } from "../../../../lib/logger";
import * as admin from "firebase-admin";

/**
 * 計画を更新し、変更履歴を保存するAPI
 * 
 * 制限:
 * - 1ヶ月に1回まで変更可能
 * - 計画開始から1週間以内は変更不可
 * - 残り1週間以内は変更不可
 */
export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "plan-update", limit: 10, windowSeconds: 60 },
      auditEventName: "plan_update",
    });

    const body = await request.json();
    const {
      planId,
      reason,
      newFormData,
      newSimulationResult,
      newGeneratedStrategy,
    } = body;

    if (!planId || !reason) {
      return NextResponse.json(
        { success: false, error: "planIdとreasonは必須です" },
        { status: 400 }
      );
    }

    // 計画を取得
    const planDoc = await adminDb.collection("plans").doc(planId).get();
    if (!planDoc.exists) {
      return NextResponse.json(
        { success: false, error: "計画が見つかりません" },
        { status: 404 }
      );
    }

    const planData = planDoc.data();
    if (planData?.userId !== uid) {
      return NextResponse.json(
        { success: false, error: "権限がありません" },
        { status: 403 }
      );
    }

    const createdAt = planData.createdAt?.toDate?.() || new Date(planData.createdAt);
    const endDate = planData.endDate?.toDate?.() || planData.endDate;
    const now = new Date();

    // 変更制限チェック
    const totalDays = Math.ceil((endDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = totalDays - elapsedDays;

    // 1週間以内は変更不可
    if (elapsedDays < 7) {
      return NextResponse.json(
        { success: false, error: "計画開始から1週間以内は変更できません" },
        { status: 400 }
      );
    }

    // 残り1週間以内は変更不可
    if (remainingDays < 7) {
      return NextResponse.json(
        { success: false, error: "残り1週間以内は変更できません" },
        { status: 400 }
      );
    }

    // 1ヶ月に1回まで制限
    const changeHistory = planData.changeHistory || [];
    const lastChange = changeHistory.length > 0 
      ? changeHistory[changeHistory.length - 1].changedAt?.toDate?.() || new Date(changeHistory[changeHistory.length - 1].changedAt)
      : null;

    if (lastChange) {
      const daysSinceLastChange = Math.ceil((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastChange < 30) {
        return NextResponse.json(
          { success: false, error: `前回の変更から${30 - daysSinceLastChange}日経過していません。1ヶ月に1回まで変更可能です。` },
          { status: 400 }
        );
      }
    }

    // 変更履歴を追加
    const newChangeHistory = [
      ...changeHistory,
      {
        reason,
        changedAt: admin.firestore.Timestamp.now(),
        previousFormData: planData.formData,
        previousSimulationResult: planData.simulationResult,
        newFormData: newFormData || planData.formData,
        newSimulationResult: newSimulationResult || planData.simulationResult,
      },
    ];

    // 計画を更新
    await adminDb.collection("plans").doc(planId).update({
      formData: newFormData || planData.formData,
      simulationResult: newSimulationResult || planData.simulationResult,
      generatedStrategy: newGeneratedStrategy || planData.generatedStrategy,
      changeHistory: newChangeHistory,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    logger.info("計画を更新しました:", { planId, reason });

    return NextResponse.json({
      success: true,
      data: {
        planId,
        changeHistory: newChangeHistory,
      },
    });
  } catch (error) {
    logger.error("計画更新エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

