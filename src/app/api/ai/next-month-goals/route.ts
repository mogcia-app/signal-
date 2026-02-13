import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebase-admin";
import { requireAuthContext } from "../../../../lib/server/auth-context";
import OpenAI from "openai";
import * as admin from "firebase-admin";
import type { KPIBreakdown } from "@/domain/analysis/kpi/types";

// OpenAI APIキーのチェック
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  try {
    return new OpenAI({ apiKey });
  } catch (error) {
    console.error("OpenAI client initialization error:", error);
    return null;
  }
};

interface NextMonthGoalProposal {
  currentFollowers: number;
  targetFollowers: number;
  followerGain: number;
  planPeriod: string;
  kpiGoals: Array<{
    key: string;
    label: string;
    currentValue: number;
    targetValue: number;
    reasoning: string;
  }>;
  actionGoals: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    kpiKey?: string; // 関連するKPIキー（オプション）
  }>;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireAuthContext(request);

    const body = await request.json();
    const { date, kpiBreakdowns } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, error: "date parameter is required" },
        { status: 400 }
      );
    }

    if (!kpiBreakdowns || !Array.isArray(kpiBreakdowns)) {
      return NextResponse.json(
        { success: false, error: "kpiBreakdowns is required" },
        { status: 400 }
      );
    }

    // 月の開始日と終了日を計算
    const [year, month] = date.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    // 今月のKPIデータを取得
    const analyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", uid)
      .where("publishedAt", ">=", startTimestamp)
      .where("publishedAt", "<=", endTimestamp)
      .get();

    const postsSnapshot = await adminDb
      .collection("posts")
      .where("userId", "==", uid)
      .get();

    const posts = postsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt
          ? data.createdAt instanceof admin.firestore.Timestamp
            ? data.createdAt.toDate()
            : data.createdAt
          : null;
        return {
          id: doc.id,
          ...data,
          createdAt,
        };
      })
      .filter((post) => {
        if (!post.createdAt) {
          return false;
        }
        return post.createdAt >= startDate && post.createdAt <= endDate;
      });

    // フォロワー数を取得（最新のデータを取得）
    const currentMonth = `${year}-${String(month).padStart(2, "0")}`;
    const prevMonth = new Date(year, month - 2, 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

    // 最新のフォロワー数を取得（updatedAtでソートして最新のものを取得）
    const latestFollowerSnapshot = await adminDb
      .collection("follower_counts")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get();

    // 今月と前月のデータを取得（月初の値を計算するため）
    const [currentMonthSnapshot, prevMonthSnapshot] = await Promise.all([
      adminDb
        .collection("follower_counts")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("month", "==", currentMonth)
        .limit(1)
        .get(),
      adminDb
        .collection("follower_counts")
        .where("userId", "==", uid)
        .where("snsType", "==", "instagram")
        .where("month", "==", prevMonthStr)
        .limit(1)
        .get(),
    ]);

    let currentFollowers = 0;
    let startFollowers = 0;

    // 最新のフォロワー数を取得（updatedAtでソートした最新の値）
    if (!latestFollowerSnapshot.empty) {
      const latestData = latestFollowerSnapshot.docs[0].data();
      currentFollowers = latestData.followers || 0;
    }

    // 月初の値を取得（優先順位: 今月のstartFollowers → 前月のfollowers → initialFollowers）
    if (!currentMonthSnapshot.empty) {
      const currentData = currentMonthSnapshot.docs[0].data();
      if (currentData.startFollowers) {
        startFollowers = currentData.startFollowers;
      } else if (!prevMonthSnapshot.empty) {
        startFollowers = prevMonthSnapshot.docs[0].data().followers || 0;
      }
    } else if (!prevMonthSnapshot.empty) {
      startFollowers = prevMonthSnapshot.docs[0].data().followers || 0;
    }

    // startFollowersがまだ0の場合、initialFollowersを取得
    if (startFollowers === 0) {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        startFollowers = userData?.businessInfo?.initialFollowers || 0;
      }
    }

    console.log("Follower calculation:", {
      currentMonth,
      prevMonthStr,
      currentFollowers,
      startFollowers,
      followerIncrease: currentFollowers - startFollowers,
    });

    // 今月の実績を計算
    const totalLikes = analyticsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().likes || 0),
      0
    );
    const totalReach = analyticsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().reach || 0),
      0
    );
    const totalSaves = analyticsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().saves || 0),
      0
    );
    const totalComments = analyticsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().comments || 0),
      0
    );
    // フォロワー増加数はKPI分解データから取得（より正確）
    let followerIncrease = currentFollowers - startFollowers;
    
    // KPI分解データにfollowersがある場合はそれを使用
    const followersKPI = kpiBreakdowns.find((kpi: KPIBreakdown) => kpi.key === "followers");
    if (followersKPI && followersKPI.value) {
      followerIncrease = followersKPI.value;
      console.log("Using followers KPI value:", followerIncrease);
    } else {
      console.log("Calculated follower increase:", followerIncrease, "from", currentFollowers, "-", startFollowers);
    }
    
    // 現在のフォロワー数（今月末のフォロワー数）を使用
    // currentFollowersは既に今月末のフォロワー数なので、そのまま使用
    const totalCurrentFollowers = currentFollowers;
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const initialFollowers = userDoc.exists ? (userDoc.data()?.businessInfo?.initialFollowers || 0) : 0;
    
    const actualPostCount = posts.length;

    // KPI分解データから伸びていない部分を分析
    const weakKPIs = kpiBreakdowns
      .filter((kpi: KPIBreakdown) => {
        // 前月比がマイナス、または変化率が低いKPIを特定
        const changePct = kpi.changePct || 0;
        return changePct < 0 || (changePct < 5 && kpi.value > 0);
      })
      .map((kpi: KPIBreakdown) => ({
        key: kpi.key,
        label: kpi.label,
        currentValue: kpi.value || 0,
        changePct: kpi.changePct || 0,
      }));

    // 現在のplanを取得
    const planSnapshot = await adminDb
      .collection("plans")
      .where("userId", "==", uid)
      .where("snsType", "==", "instagram")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    // previousTarget calculation removed (unused)
    if (!planSnapshot.empty) {
      // plan data retrieved but not used
    }

    // AIに来月の目標を提案させる
    const openai = getOpenAIClient();
    let proposal: NextMonthGoalProposal;

    // KPI分解データのサマリーを作成
    const kpiSummary = kpiBreakdowns.map((kpi: KPIBreakdown) => ({
      key: kpi.key,
      label: kpi.label,
      value: kpi.value || 0,
      changePct: kpi.changePct || 0,
      unit: kpi.unit || "count",
    }));

    if (openai) {
      try {
        const prompt = `あなたはInstagram運用の専門家です。以下の今月の実績データとKPI分解データを基に、来月の現実的なKPI目標を提案してください。

【今月の実績】
- 現在のフォロワー数: ${totalCurrentFollowers}人（利用開始時: ${initialFollowers}人、今月の増加数: ${followerIncrease}人）
- フォロワー増加数: ${followerIncrease}人
${(() => {
  const startFollowers = totalCurrentFollowers - followerIncrease;
  const increaseRate = startFollowers > 0 ? ((followerIncrease / startFollowers) * 100).toFixed(1) : "0.0";
  return `- フォロワー増加率: ${increaseRate}%（今月の増加数 ÷ 月初のフォロワー数）`;
})()}
- 投稿数: ${actualPostCount}件
- 総リーチ数: ${totalReach}人
- 総いいね数: ${totalLikes}件
- 総保存数: ${totalSaves}件
- 総コメント数: ${totalComments}件

【KPI分解データ】
${kpiSummary.map((kpi) => `- ${kpi.label}: ${kpi.value.toLocaleString()}${kpi.unit === "percent" ? "%" : ""} (前月比: ${kpi.changePct > 0 ? "+" : ""}${kpi.changePct.toFixed(1)}%)`).join("\n")}

【伸びていないKPI】
${weakKPIs.length > 0 ? weakKPIs.map((kpi) => `- ${kpi.label}: ${kpi.currentValue.toLocaleString()} (前月比: ${kpi.changePct > 0 ? "+" : ""}${kpi.changePct.toFixed(1)}%)`).join("\n") : "特にありません"}

以下のJSON形式で回答してください。伸びていないKPIを重点的に改善する目標を設定し、数値目標だけでなく、具体的な行動目標も提案してください。

【重要】行動目標は、数値目標を達成するための具体的なアクションを提案してください。例えば：
- 「週3回の投稿頻度を維持し、ハッシュタグ戦略を見直す」
- 「既存フォロワーとのエンゲージメントを高めるため、ストーリーズを毎日更新する」
- 「コメントへの返信を24時間以内に行い、コミュニティ形成を強化する」

{
  "currentFollowers": ${totalCurrentFollowers},
  "targetFollowers": [来月の目標フォロワー数（現在のトータルフォロワー数から現実的に増やせる数）],
  "followerGain": [目標増加数（targetFollowers - currentFollowers）],
  "planPeriod": "1ヶ月",
  "kpiGoals": [
    {
      "key": "reach",
      "label": "リーチ",
      "currentValue": [今月のリーチ数],
      "targetValue": [来月の目標リーチ数（現実的に達成可能な数）],
      "reasoning": "[なぜこの目標を設定したかの理由]"
    },
    {
      "key": "engagement",
      "label": "エンゲージメント",
      "currentValue": [今月のエンゲージメント数],
      "targetValue": [来月の目標エンゲージメント数],
      "reasoning": "[なぜこの目標を設定したかの理由]"
    }
  ],
  "actionGoals": [
    {
      "title": "[行動目標のタイトル（例：投稿頻度の最適化）]",
      "description": "[具体的な行動内容（例：週3回の投稿頻度を維持し、ハッシュタグ戦略を見直す）]",
      "priority": "high",
      "kpiKey": "reach"
    },
    {
      "title": "[行動目標のタイトル（例：エンゲージメント向上）]",
      "description": "[具体的な行動内容（例：ストーリーズを毎日更新し、コメントへの返信を24時間以内に行う）]",
      "priority": "medium",
      "kpiKey": "engagement"
    }
  ],
  "reasoning": "[全体的な目標設定の理由を2-3文で説明]"
}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "あなたはInstagram運用の専門家です。KPI分解データを分析し、伸びていない部分を重点的に改善する目標を提案してください。数値目標だけでなく、具体的な行動目標も必ず含めてください。行動目標は、ユーザーが実際に実行できる具体的なアクションを提案してください。JSON形式で必ず回答してください。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 2000,
        });

        const responseText = completion.choices[0]?.message?.content || "{}";
        try {
          proposal = JSON.parse(responseText);
        } catch (parseError) {
          console.error("AI response parse error:", parseError);
          throw new Error("AI response parse failed");
        }
      } catch (aiError) {
        console.error("OpenAI API error:", aiError);
        // フォールバック: シンプルな計算
        const suggestedGain = Math.max(10, Math.floor(followerIncrease * 1.2));
        const reachKPI = kpiBreakdowns.find((k: KPIBreakdown) => k.key === "reach");
        // engagementKPI removed (unused)
        
        proposal = {
          currentFollowers: totalCurrentFollowers,
          targetFollowers: totalCurrentFollowers + suggestedGain,
          followerGain: suggestedGain,
          planPeriod: "1ヶ月",
          kpiGoals: [
            {
              key: "reach",
              label: "リーチ",
              currentValue: reachKPI?.value || totalReach,
              targetValue: Math.floor((reachKPI?.value || totalReach) * 1.2),
              reasoning: "リーチ数を20%向上させることを目標にします。",
            },
            {
              key: "engagement",
              label: "エンゲージメント",
              currentValue: totalLikes + totalComments + totalSaves,
              targetValue: Math.floor((totalLikes + totalComments + totalSaves) * 1.2),
              reasoning: "エンゲージメントを20%向上させることを目標にします。",
            },
          ],
          actionGoals: [
            {
              title: "投稿頻度の最適化",
              description: "週3回の投稿頻度を維持し、ハッシュタグ戦略を見直してリーチ数を向上させます。",
              priority: "high",
              kpiKey: "reach",
            },
            {
              title: "エンゲージメント向上",
              description: "ストーリーズを毎日更新し、コメントへの返信を24時間以内に行い、コミュニティ形成を強化します。",
              priority: "medium",
              kpiKey: "engagement",
            },
          ],
          reasoning: `今月は${followerIncrease}人のフォロワー増加を達成しました。来月は${suggestedGain}人の増加を目標に設定することをおすすめします。`,
        };
      }
    } else {
      // OpenAI APIキーが設定されていない場合のフォールバック
      console.warn("OpenAI API key not configured, using fallback calculation");
      const suggestedGain = Math.max(10, Math.floor(followerIncrease * 1.2));
      const reachKPI = kpiBreakdowns.find((k: KPIBreakdown) => k.key === "reach");
      // engagementKPI removed (unused)
      // const engagementKPI = kpiBreakdowns.find((k: KPIBreakdown) => k.key === "engagement");
      
      proposal = {
        currentFollowers: totalCurrentFollowers,
        targetFollowers: totalCurrentFollowers + suggestedGain,
        followerGain: suggestedGain,
        planPeriod: "1ヶ月",
        kpiGoals: [
          {
            key: "reach",
            label: "リーチ",
            currentValue: reachKPI?.value || totalReach,
            targetValue: Math.floor((reachKPI?.value || totalReach) * 1.2),
            reasoning: "リーチ数を20%向上させることを目標にします。",
          },
          {
            key: "engagement",
            label: "エンゲージメント",
            currentValue: totalLikes + totalComments + totalSaves,
            targetValue: Math.floor((totalLikes + totalComments + totalSaves) * 1.2),
            reasoning: "エンゲージメントを20%向上させることを目標にします。",
          },
        ],
        actionGoals: [
          {
            title: "投稿頻度の最適化",
            description: "週3回の投稿頻度を維持し、ハッシュタグ戦略を見直してリーチ数を向上させます。",
            priority: "high",
            kpiKey: "reach",
          },
          {
            title: "エンゲージメント向上",
            description: "ストーリーズを毎日更新し、コメントへの返信を24時間以内に行い、コミュニティ形成を強化します。",
            priority: "medium",
            kpiKey: "engagement",
          },
        ],
        reasoning: `今月は${followerIncrease}人のフォロワー増加を達成しました。来月は${suggestedGain}人の増加を目標に設定することをおすすめします。`,
      };
    }

    return NextResponse.json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    console.error("Next month goals API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

