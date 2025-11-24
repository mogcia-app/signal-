import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebase-admin";
import { buildErrorResponse, requireAuthContext } from "@/lib/server/auth-context";
import * as admin from "firebase-admin";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// 月の範囲を計算
function getMonthRange(date: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const start = new Date(Date.UTC(yearStr, monthStr - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(yearStr, monthStr, 0, 23, 59, 59, 999));
  return { start, end };
}

// 月名を取得
function getMonthName(date: string): string {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const dateObj = new Date(yearStr, monthStr - 1, 1);
  return dateObj.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

// 次月名を取得
function getNextMonthName(date: string): string {
  const [yearStr, monthStr] = date.split("-").map(Number);
  const nextMonth = new Date(yearStr, monthStr, 1);
  return nextMonth.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  focusArea: string;
  expectedImpact: string;
  recommendedActions: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "analytics-action-plans", limit: 10, windowSeconds: 60 },
      auditEventName: "analytics_action_plans_access",
    });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 7); // YYYY-MM形式

    if (!/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date parameter must be in YYYY-MM format" },
        { status: 400 }
      );
    }

    // 月の範囲を計算
    const { start, end } = getMonthRange(date);
    const startTimestamp = admin.firestore.Timestamp.fromDate(start);
    const endTimestamp = admin.firestore.Timestamp.fromDate(end);

    // 必要なデータを取得（並列）- analyticsコレクション（分析済みデータ）のみを使用
    const [analyticsSnapshot, plansSnapshot] = await Promise.all([
      // 期間内の分析データを取得（分析済みデータのみ）
      adminDb
        .collection("analytics")
        .where("userId", "==", uid)
        .where("publishedAt", ">=", startTimestamp)
        .where("publishedAt", "<=", endTimestamp)
        .get(),

      // 運用計画の有無
      adminDb
        .collection("plans")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("status", "==", "active")
        .limit(1)
        .get(),
    ]);

    const analyzedCount = analyticsSnapshot.docs.length;
    const hasPlan = !plansSnapshot.empty;

    // 投稿と分析データをpostIdで紐付け（重複除去: 同じpostIdの最新レコードのみ保持）
    const analyticsByPostId = new Map<string, any>();
    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const postId = data.postId;
      if (postId) {
        const existing = analyticsByPostId.get(postId);
        if (!existing || (data.publishedAt && existing.publishedAt && data.publishedAt > existing.publishedAt)) {
          analyticsByPostId.set(postId, data);
        }
      }
    });

    // KPIを集計
    let totalLikes = 0;
    let totalReach = 0;
    let totalComments = 0;
    let totalSaves = 0;
    let totalShares = 0;
    let totalFollowerIncrease = 0;

    analyticsByPostId.forEach((data) => {
      totalLikes += data.likes || 0;
      totalReach += data.reach || 0;
      totalComments += data.comments || 0;
      totalSaves += data.saves || 0;
      totalShares += data.shares || 0;
      totalFollowerIncrease += data.followerIncrease || 0;
    });

    // 投稿タイプ別の統計を計算（analyticsコレクションのデータのみを使用）
    const postTypeStats: Record<string, { count: number; totalReach: number }> = {};

    analyticsByPostId.forEach((analytics, postId) => {
      const postType = analytics.category || analytics.postType || "unknown";
      const reach = analytics.reach || 0;

      if (!postTypeStats[postType]) {
        postTypeStats[postType] = { count: 0, totalReach: 0 };
      }
      postTypeStats[postType].count++;
      postTypeStats[postType].totalReach += reach;
    });

    // 投稿タイプのラベルを日本語に変換
    const typeLabelMap: Record<string, string> = {
      feed: "画像投稿",
      reel: "リール",
      story: "ストーリー",
      carousel: "カルーセル",
      video: "動画",
      unknown: "その他",
    };

    // 投稿タイプ別の統計を配列に変換
    const postTypeArray = Object.entries(postTypeStats)
      .map(([type, stats]) => ({
        type,
        label: typeLabelMap[type] || type,
        count: stats.count,
        totalReach: stats.totalReach,
        percentage: totalReach > 0 ? (stats.totalReach / totalReach) * 100 : 0,
      }))
      .sort((a, b) => b.totalReach - a.totalReach);

    // 前月のデータを取得（前月比計算用）
    const prevMonth = new Date(start);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
    const { start: prevStart, end: prevEnd } = getMonthRange(prevMonthStr);
    const prevStartTimestamp = admin.firestore.Timestamp.fromDate(prevStart);
    const prevEndTimestamp = admin.firestore.Timestamp.fromDate(prevEnd);

    const prevAnalyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .where("publishedAt", ">=", prevStartTimestamp)
      .where("publishedAt", "<=", prevEndTimestamp)
      .get();

    let prevTotalReach = 0;
    prevAnalyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      prevTotalReach += data.reach || 0;
    });

    const reachChange = prevTotalReach > 0 
      ? ((totalReach - prevTotalReach) / prevTotalReach) * 100 
      : 0;

    // 運用計画の情報を取得
    let planInfo = null;
    if (hasPlan) {
      const planDoc = plansSnapshot.docs[0];
      const planData = planDoc.data();
      planInfo = {
        title: planData.title || "運用計画",
        targetFollowers: planData.targetFollowers || 0,
        currentFollowers: planData.currentFollowers || 0,
      };
    }

    // AI生成でアクションプランを生成
    let actionPlans: ActionPlan[] = [];
    if (openai && analyzedCount > 0) {
      try {
        const currentMonth = getMonthName(date);
        const nextMonth = getNextMonthName(date);

        const prompt = `以下のInstagram運用データを基に、${nextMonth}に向けた優先度の高いアクションプランを最大3件生成してください。

【データ】
- 分析済み投稿数: ${analyzedCount}件
- 分析済み数: ${analyzedCount}件
- いいね数: ${totalLikes.toLocaleString()}
- リーチ数: ${totalReach.toLocaleString()}${prevTotalReach > 0 ? `（前月比${reachChange >= 0 ? "+" : ""}${reachChange.toFixed(1)}％）` : ""}
- コメント数: ${totalComments.toLocaleString()}
- 保存数: ${totalSaves.toLocaleString()}
- フォロワー増減: ${totalFollowerIncrease >= 0 ? "+" : ""}${totalFollowerIncrease.toLocaleString()}
${hasPlan ? `- 運用計画: ${planInfo?.title || "あり"}` : "- 運用計画: 未設定"}

【投稿タイプ別の統計】
${postTypeArray.length > 0
  ? postTypeArray
      .map((stat) => `${stat.label}: ${stat.count}件（${stat.percentage.toFixed(0)}％）`)
      .join("、")
  : "データがありません"}

【出力形式】
必ず次のJSON形式のみで回答してください：
{
  "actionPlans": [
    {
      "id": "string（ユニーク）",
      "title": "string",
      "description": "string",
      "priority": "high" | "medium" | "low",
      "focusArea": "string",
      "expectedImpact": "string",
      "recommendedActions": ["string", ...]
    }
  ]
}

【制約】
- JSON以外の文字列や説明は一切出力しない
- recommendedActionsは日本語の具体的な提案を少なくとも2つ含める
- priorityはhigh/medium/lowのいずれか
- idは重複しないようにする
- データに基づいた具体的で実用的なアクションプランにしてください
- 実行に時間がかかるものから優先度順に並べてください`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "あなたはInstagram運用の専門家です。データに基づいて優先度の高いアクションプランを提供します。JSON形式のみで回答してください。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        });

        const responseText = completion.choices[0]?.message?.content || "";
        const parsed = JSON.parse(responseText);

        if (Array.isArray(parsed?.actionPlans)) {
          actionPlans = parsed.actionPlans.map((plan: any, index: number) => ({
            id: plan.id || `action-plan-${index}`,
            title: plan.title || "",
            description: plan.description || "",
            priority: (plan.priority === "high" || plan.priority === "medium" || plan.priority === "low")
              ? plan.priority
              : "medium",
            focusArea: plan.focusArea || "全体",
            expectedImpact: plan.expectedImpact || "",
            recommendedActions: Array.isArray(plan.recommendedActions)
              ? plan.recommendedActions.filter((action: any) => typeof action === "string")
              : [],
          })).filter((plan: ActionPlan) => plan.title && plan.recommendedActions.length > 0);
        }
      } catch (aiError) {
        console.error("AIアクションプラン生成エラー:", aiError);
        // フォールバック
        actionPlans = [
          {
            id: "fallback-1",
            title: "投稿頻度の維持",
            description: "安定した投稿頻度を維持しましょう",
            priority: "high",
            focusArea: "投稿頻度",
            expectedImpact: "継続的なエンゲージメント向上",
            recommendedActions: [
              "週間投稿スケジュールを設定する",
              "投稿タイプのバランスを保つ",
            ],
          },
        ];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        actionPlans,
        month: date,
        monthName: getMonthName(date),
        nextMonthName: getNextMonthName(date),
      },
    });
  } catch (error) {
    console.error("❌ アクションプラン取得エラー:", error);
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(
      {
        ...body,
        error: "アクションプランの取得に失敗しました",
      },
      { status }
    );
  }
}

