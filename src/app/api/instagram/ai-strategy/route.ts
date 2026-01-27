import { NextRequest, NextResponse } from "next/server";
import { searchRelevantKnowledge, saveUserAnalysis, getLearningInsights } from "./knowledge-base";
import { buildPlanPrompt } from "../../../../utils/aiPromptBuilder";
import { adminDb } from "../../../../lib/firebase-admin";
import { UserProfile } from "../../../../types/user";
import { buildErrorResponse, requireAuthContext } from "../../../../lib/server/auth-context";
import { getUserProfile } from "@/lib/server/user-profile";
import { canAccessFeature } from "@/lib/plan-access";
import {
  buildPostPatternPromptSection,
  getMasterContext,
} from "../../ai/monthly-analysis/infra/firestore/master-context";

// セキュリティ: APIキーの検証
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateApiKey(_request: NextRequest): boolean {
  const apiKey = _request.headers.get("x-api-key");
  const validApiKey = process.env.INTERNAL_API_KEY;

  if (!validApiKey) {
    console.error("INTERNAL_API_KEY not configured");
    return false;
  }

  return apiKey === validApiKey;
}

// 入力データの検証
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateInputData(_data: unknown): boolean {
  if (!_data || typeof _data !== "object") {
    return false;
  }

  const dataObj = _data as Record<string, unknown>;

  // 必須フィールドのチェック
  const requiredFields = ["currentFollowers", "targetFollowers", "planPeriod"];
  return requiredFields.every(
    (field) => dataObj[field] !== undefined && dataObj[field] !== null && dataObj[field] !== ""
  );
}

// AI戦略生成のメイン関数（プロンプトビルダーベース）
async function generateAIStrategy(
  formData: Record<string, unknown>,
  selectedStrategies: string[] = [],
  selectedCategories: string[] = [],
  simulationResult: Record<string, unknown> | null = null,
  userId: string = "anonymous"
): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // ユーザープロファイルを取得
  let userProfile: UserProfile | null = null;
  try {
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData && userData.businessInfo) {
        userProfile = userData as UserProfile;
      } else {
        console.warn("ユーザープロファイルにbusinessInfoが存在しません");
      }
    } else {
      console.warn("ユーザードキュメントが存在しません");
    }
  } catch (error) {
    console.error("ユーザープロファイル取得エラー:", error);
    throw new Error(`ユーザープロファイルの取得に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // 分析データを取得（PDCA - Check）
  let analyticsData: Array<{
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
    publishedTime?: string;
    category?: string;
  }> = [];
  try {
    const analyticsSnapshot = await adminDb
      .collection("analytics")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    analyticsData = analyticsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const reach = data.reach || 0;
      const totalEngagement = (data.likes || 0) + (data.comments || 0) + (data.shares || 0);
      const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

      return {
        reach,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        engagementRate,
        publishedTime: data.publishedTime || "",
        category: data.category || "feed",
      };
    });
    console.log(`✅ 分析データ取得成功: ${analyticsData.length}件`);
  } catch (error) {
    console.warn("⚠️ 分析データ取得エラー:", error);
  }

  // 月次レポートデータを取得（PDCA - Act）
  let monthlyReportData: {
    currentScore?: number;
    previousScore?: number;
    performanceRating?: string;
    improvements?: string[];
    actionPlan?: string;
  } | null = null;
  try {
    const reportSnapshot = await adminDb
      .collection("monthlyReports")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!reportSnapshot.empty) {
      const reportData = reportSnapshot.docs[0].data();
      monthlyReportData = {
        currentScore: reportData.currentScore || 0,
        previousScore: reportData.previousScore || 0,
        performanceRating: reportData.performanceRating || "C",
        improvements: reportData.improvements || [],
        actionPlan: reportData.actionPlan || "",
      };
      console.log("✅ 月次レポートデータ取得成功");
    }
  } catch (error) {
    console.warn("⚠️ 月次レポートデータ取得エラー:", error);
  }

  // プロンプトビルダーを使用してシステムプロンプトを構築
  let systemPrompt: string;

  if (userProfile && userProfile.businessInfo) {
    // ✅ プロンプトビルダーを使用（クライアントの詳細情報を含む）
    // selectedStrategiesとselectedCategoriesをformDataに含める
    const enhancedFormData = {
      ...formData,
      strategyValues:
        selectedStrategies.length > 0 ? selectedStrategies : formData.strategyValues || [],
      postCategories:
        selectedCategories.length > 0 ? selectedCategories : formData.postCategories || [],
    };

    try {
    systemPrompt = buildPlanPrompt(
      userProfile,
      "instagram",
      enhancedFormData as {
        currentFollowers?: number | string;
        targetFollowers?: number | string;
        planPeriod?: string;
        goalCategory?: string;
        strategyValues?: string[];
        postCategories?: string[];
        brandConcept?: string;
        colorVisual?: string;
        tone?: string;
      },
      simulationResult as {
        monthlyTarget?: number | string;
        feasibilityLevel?: string;
        postsPerWeek?: { feed?: number; reel?: number };
      }
    );
    } catch (promptError) {
      console.error("プロンプト構築エラー:", promptError);
      throw new Error(`プロンプトの構築に失敗しました: ${promptError instanceof Error ? promptError.message : "Unknown error"}`);
    }

    // 分析データの参照（PDCA - Check）
    if (analyticsData.length > 0) {
      const totalReach = analyticsData.reduce((sum, a) => sum + a.reach, 0);
      const totalEngagement = analyticsData.reduce(
        (sum, a) => sum + a.likes + a.comments + a.shares,
        0
      );
      const avgEngagementRate =
        analyticsData.reduce((sum, a) => sum + a.engagementRate, 0) / analyticsData.length;
      const bestPerformingCategory = analyticsData.reduce((best, current) =>
        current.engagementRate > best.engagementRate ? current : best
      );

      systemPrompt += `

【過去の分析データ参照（PDCA - Check）】
- データ期間: 過去${analyticsData.length}件の投稿
- 総リーチ: ${totalReach.toLocaleString()}
- 総エンゲージメント: ${totalEngagement.toLocaleString()}
- 平均エンゲージメント率: ${avgEngagementRate.toFixed(2)}%
- 最も効果的だった投稿タイプ: ${bestPerformingCategory.category} (${bestPerformingCategory.engagementRate.toFixed(2)}%)

これらの実績データを基に、より効果的な戦略を提案してください。`;
    }

    // 月次レポートデータの参照（PDCA - Act）
    if (monthlyReportData) {
      const scoreDiff =
        (monthlyReportData.currentScore || 0) - (monthlyReportData.previousScore || 0);
      systemPrompt += `

【月次レポート結果参照（PDCA - Act）】
- 現在のスコア: ${monthlyReportData.currentScore || 0}点
- 前月比: ${scoreDiff > 0 ? "+" : ""}${scoreDiff}点
- パフォーマンス評価: ${monthlyReportData.performanceRating || "C"}
- 改善点: ${monthlyReportData.improvements?.join(", ") || "なし"}
- アクションプラン: ${monthlyReportData.actionPlan?.substring(0, 200) || "なし"}

前月の振り返り結果を踏まえ、継続すべき点と改善すべき点を明確にして戦略を提案してください。`;
    }
  } else {
    // フォールバック: ユーザープロファイルがない場合（関係性設計型に更新）
    systemPrompt = `あなたはInstagram運用の専門家です。2026年のInstagramアルゴリズム変更に対応し、**関係性設計型**の戦略を生成してください。

「拡散」よりも「安心感の積み上げ」、「投稿の点」よりも「投稿前後の流れ」を重視します。
ストーリーズを主軸に、フィード/リールはその結果として伸びる構造を提案してください。

以下の4つのセクションで回答してください：

① 全体運用戦略（AI提案）
- 「拡散」よりも「安心感の積み上げ」を重視
- ストーリーズを主軸に、フォロワーとの日常的な接点を増やす
- 投稿は単体で完結させず、投稿前後のストーリーズによる反応設計を含める

② 投稿設計（AI設計）
- メイン投稿（週1〜2回）: リールまたはカルーセルで、考え方・雰囲気・安心感を伝える
- ストーリーズ（ほぼ毎日）: 投稿前後にアンケート・質問・補足を行い、反応を蓄積
- ストーリーズの反応をもとに、次の投稿テーマを調整する改善サイクル

③ カスタマージャーニー
- ①日常接触（ストーリーズ） → ②反応（質問・投票） → ③理解（フィード/カルーセル） → ④信頼（日常投稿） → ⑤行動（問い合わせ）
- 機能ベースではなく、関係性の深まりを表現

④ 注視すべき指標（AI推奨）
- ストーリーズ閲覧率、スタンプ反応率、投稿後24時間の初動反応、プロフィールアクセス数、DM・問い合わせ数
- フォロワー数より関係性指標を重視

各セクションは具体的で実行可能なアドバイスを含むようにしてください。

計画データ:
- 現在のフォロワー数: ${formData?.currentFollowers || "未設定"}
- 目標フォロワー数: ${formData?.targetFollowers || "未設定"}
- 達成期間: ${formData?.planPeriod || "未設定"}
- ターゲット層: ${formData?.targetAudience || "未設定"}
- KPIカテゴリ: ${formData?.goalCategory || "未設定"}
- その他目標: ${formData?.otherGoal || "未設定"}
- ブランドコンセプト: ${formData?.brandConcept || "未設定"}
- メインカラー: ${formData?.colorVisual || "未設定"}
- 文章トーン: ${formData?.tone || "未設定"}
- 取り組みたいこと（選択戦略）: ${selectedStrategies.length > 0 ? selectedStrategies.join(", ") : Array.isArray(formData?.strategyValues) ? formData.strategyValues.join(", ") : "なし"}
- 投稿したい内容（投稿カテゴリ）: ${selectedCategories.length > 0 ? selectedCategories.join(", ") : Array.isArray(formData?.postCategories) ? formData.postCategories.join(", ") : "なし"}

シミュレーション結果:
- 月間目標: ${simulationResult?.monthlyTarget || "N/A"}
- 実現可能性: ${simulationResult?.feasibilityLevel || "N/A"}
- 週間投稿数: フィード${(simulationResult?.postsPerWeek as Record<string, unknown>)?.feed || 0}回、リール${(simulationResult?.postsPerWeek as Record<string, unknown>)?.reel || 0}回`;

    // フォールバックでも分析データを参照
    if (analyticsData.length > 0) {
      const totalReach = analyticsData.reduce((sum, a) => sum + a.reach, 0);
      const totalEngagement = analyticsData.reduce(
        (sum, a) => sum + a.likes + a.comments + a.shares,
        0
      );
      const avgEngagementRate =
        analyticsData.reduce((sum, a) => sum + a.engagementRate, 0) / analyticsData.length;

      systemPrompt += `

過去の実績データ:
- データ期間: 過去${analyticsData.length}件の投稿
- 総リーチ: ${totalReach.toLocaleString()}
- 総エンゲージメント: ${totalEngagement.toLocaleString()}
- 平均エンゲージメント率: ${avgEngagementRate.toFixed(2)}%

これらの実績を踏まえて戦略を提案してください。`;
    }
  }

  // RAG: 関連知識を検索（既存の学習機能を維持）
  // エラーが発生しても戦略生成は続行する
  let relevantKnowledge: Array<{ content: string }> = [];
  let learningInsights: string | null = null;
  let patternLearningContext: string | null = null;

  try {
    relevantKnowledge = searchRelevantKnowledge(formData, simulationResult);
  } catch (error) {
    console.warn("⚠️ 関連知識検索エラー（続行）:", error);
  }

  try {
    learningInsights = getLearningInsights(userId);
  } catch (error) {
    console.warn("⚠️ 学習インサイト取得エラー（続行）:", error);
  }

  try {
  const masterContext = await getMasterContext(userId);
    patternLearningContext = buildPostPatternPromptSection(masterContext?.postPatterns) || null;
  } catch (error) {
    console.warn("⚠️ MasterContext取得エラー（続行）:", error);
    // エラーが発生しても戦略生成は続行
  }

  // RAG: 関連知識をプロンプトに追加
  const knowledgeContext =
    relevantKnowledge.length > 0
      ? `\n\n【関連するベストプラクティス】\n${relevantKnowledge.map((k) => `- ${k.content}`).join("\n")}`
      : "";

  const learningContext = learningInsights
    ? `\n\n【過去の分析からの学習】\n${learningInsights}`
    : "";

  if (patternLearningContext) {
    systemPrompt += patternLearningContext;
  }

  const planPeriod = (formData.planPeriod as string) || "1ヶ月";
  const months = planPeriod.includes("3") ? 3 : planPeriod.includes("6") ? 6 : planPeriod.includes("1年") ? 12 : 1;
  const totalWeeks = months * 4;

  const userPrompt = `
【重要】以下の点を必ず守って、**3段階の情報提示形式**で戦略を提案してください：

## 📋 出力形式（必須）

以下の3つのレベルで構成してください：

### 【レベル1】超シンプル版（初心者向け）
━━━━━━━━━━━━━━━━━━━━
📅 今週やること（第1週目）
- 具体的な曜日と行動を記載（例: 月曜: ストーリーで「今日のコーヒー」を投稿）
- 専門用語は一切使わない
- コピペで使える具体的な内容

🎯 今月の目標（1ヶ月目）
- わかりやすい言葉で（例: ストーリーを見てくれる人: 60%以上）
- 数値目標に「なぜこの数字?」の説明を併記

💡 一番大事なこと
- 1行で簡潔に（例: 毎日ストーリーを投稿して、お客さんとの接点を増やしましょう！）

${months > 1 ? `【重要】計画期間が${months}ヶ月のため、${months}ヶ月分（全${totalWeeks}週分）の週次・月次データも生成してください：

📅 週次データ（${months}ヶ月分、全${totalWeeks}週の「今週やること」）
- 第1週: 月曜: ..., 水曜: ..., 金曜: ...
- 第2週: 月曜: ..., 水曜: ..., 金曜: ...
- ...（全${totalWeeks}週分、各週で具体的な曜日と行動を記載）

🎯 月次データ（${months}ヶ月分、各月の「今月の目標」）
- 1ヶ月目: ・ストーリーの反応: 30%以上、・投稿へのいいね: 50個以上、・プロフィール閲覧: 2倍に
- 2ヶ月目: ...（目標を段階的に上げる）
- ...（${months}ヶ月分、各月で具体的な目標を記載）` : '【重要】計画期間が1ヶ月のため、週次・月次データは第1週と1ヶ月目のみで問題ありません。'}

### 【レベル2】詳細版（中級者向け）
━━━━━━━━━━━━━━━━━━━━
📋 この3ヶ月でやること
【ステップ1】知ってもらう(1ヶ月目)
- 具体的な行動を3つ程度
【ステップ2】興味を持ってもらう(2ヶ月目)
- 具体的な行動を3つ程度
【ステップ3】行動してもらう(3ヶ月目)
- 具体的な行動を3つ程度

📊 こんな成長を目指します
- 現在のフォロワー数から目標までの推移を月次で表示
- 「大事なのはフォロワー数より、『反応してくれる人』を増やすこと!」というメッセージ

💡 なぜこの戦略?
- 3つの理由を簡潔に（専門用語は使わない）

### 【レベル3】上級者向け（詳細戦略）
━━━━━━━━━━━━━━━━━━━━
① 全体運用戦略
- 関係性設計型の思想を反映
- ストーリーズを主軸にした戦略

② 投稿設計
- メイン投稿、ストーリーズ、フィードバックの設計

③ カスタマージャーニー
- 5段階の流れ（日常接触→反応→理解→信頼→行動）

④ 注視すべき指標
- ストーリーズ閲覧率、スタンプ反応率、投稿初動反応、プロフィールアクセス、DM・問い合わせ

## 🎯 重要なルール

1. **関係性設計型の思想を反映** - 「何を投稿するか」ではなく「どう関係性を積み上げるか」を設計
2. **ストーリーズを主軸に** - ストーリーズを戦略の中心に置く
3. **専門用語は翻訳** - レベル1・2では専門用語を使わず、わかりやすい言葉で説明
4. **実例を必ず含める** - 投稿タイトル、リールのフック、ストーリーの質問など、コピペで使える実例を提示
5. **業種の特性を活かす** - ${userProfile ? userProfile.businessInfo.industry : ""}業界ならではの強みや切り口を提示

上記の3段階形式で、**即実行可能で具体的な**戦略を提案してください。${knowledgeContext}${learningContext}${patternLearningContext}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // コスト削減のためgpt-4o-miniに変更
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000, // より詳細な戦略のために増量
        temperature: 0.8, // 創造性を高める
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    const generatedStrategy = data.choices[0]?.message?.content || "戦略の生成に失敗しました。";

    // 週次・月次データを抽出して構造化
    const { extractAllWeeklyTasks, extractAllMonthlyGoals } = await import(
      "../../../instagram/plan/utils/weeklyMonthlyParser"
    );
    const weeklyTasks = extractAllWeeklyTasks(generatedStrategy, formData);
    const monthlyGoals = extractAllMonthlyGoals(generatedStrategy, formData);

    // ✅ 運用計画をFirestoreに保存（PDCAのP - Plan）
    try {
      const startDate = formData.startDate
        ? new Date(formData.startDate as string)
        : new Date();
      
      await adminDb.collection("plans").add({
        userId,
        snsType: "instagram",
        planType: "ai_generated",
        formData,
        simulationResult: simulationResult || {},
        generatedStrategy,
        // 週次・月次データを構造化して保存
        weeklyTasks: weeklyTasks.length > 0 ? weeklyTasks : undefined,
        monthlyGoals: monthlyGoals.length > 0 ? monthlyGoals : undefined,
        startDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active", // active, archived, draft
      });
      console.log("✅ 運用計画をFirestoreに保存しました（週次・月次データ含む）");
    } catch (saveError) {
      console.error("⚠️ 運用計画の保存エラー:", saveError);
      // エラーでも戦略生成は成功として扱う
    }

    // 分析結果を保存（学習用・既存機能）
    saveUserAnalysis({
      userId,
      formData,
      simulationResult: simulationResult || {},
      generatedStrategy,
    });

    return generatedStrategy;
  } catch (error) {
    console.error("AI Strategy generation error:", error);
    throw new Error(
      `AI戦略生成エラー: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid: userId } = await requireAuthContext(request, {
      requireContract: true,
      rateLimit: { key: "instagram-ai-strategy", limit: 15, windowSeconds: 60 },
      auditEventName: "instagram_ai_strategy",
    });

    // プラン階層別アクセス制御: 松プランのみアクセス可能
    const userProfile = await getUserProfile(userId);
    if (!canAccessFeature(userProfile, "canAccessPlan")) {
      return NextResponse.json(
        { error: "運用計画機能は、現在のプランではご利用いただけません。" },
        { status: 403 }
      );
    }

    // リクエストボディの取得
    const body = await request.json();
    console.log("Received request body:", JSON.stringify(body, null, 2));

    // AI戦略生成
    const aiStrategy = await generateAIStrategy(
      body.formData || {},
      body.selectedStrategies || [],
      body.selectedCategories || [],
      body.simulationResult || null,
      userId
    );

    return NextResponse.json({
      strategy: aiStrategy,
      timestamp: new Date().toISOString(),
      tokensUsed: 2000, // 概算値
    });
  } catch (error) {
    console.error("AI Strategy API Error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // エラーログを記録（本番環境では適切なログサービスを使用）
    const { status, body: errorBody } = buildErrorResponse(error);

    return NextResponse.json(
      {
        ...errorBody,
        error: errorBody.error || (error instanceof Error ? error.message : "Unknown error"),
        details:
          process.env.NODE_ENV === "development"
            ? errorBody.details ?? (error instanceof Error ? error.stack : "Unknown error")
            : undefined,
      },
      { status }
    );
  }
}

// セキュリティ: GETリクエストは拒否
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
