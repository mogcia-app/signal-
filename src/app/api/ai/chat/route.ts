import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminAuth, adminDb } from '../../../../lib/firebase-admin';

// OpenAI APIの初期化
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

interface ChatRequest {
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
  pageType?: string;
}

interface InstagramData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  planData?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analyticsData?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postsData?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  goalSettings?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentActivity?: any[];
}

export async function POST(request: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body: ChatRequest = await request.json();
    const { message, userId, pageType } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // 🔐 Firebase認証トークンからユーザーIDを取得
    let authenticatedUserId = 'anonymous';
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        authenticatedUserId = decodedToken.uid;
      } catch (authError) {
        console.warn('⚠️ Firebase認証エラー（匿名ユーザーとして処理）:', authError);
      }
    }

    // 実際のユーザーIDを優先
    const currentUserId = userId || authenticatedUserId;

    // Instagram全体のデータを取得
    const instagramData = await fetchInstagramData(currentUserId);

    // Instagram専門のAIプロンプトを構築
    const systemPrompt = buildInstagramAIPrompt(instagramData);

    // OpenAI APIを呼び出し
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || '申し訳ございません。回答を生成できませんでした。';

    // 使用回数を記録
    await recordUsage(currentUserId);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { 
        error: 'AI chat failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Instagram全体のデータを取得する関数
async function fetchInstagramData(userId: string): Promise<InstagramData> {
  try {
    const [planSnapshot, analyticsSnapshot, postsSnapshot, goalSettingsSnapshot] = await Promise.all([
      // 運用計画データ
      adminDb.collection('plans')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get(),
      
      // 分析データ（最新10件）
      adminDb.collection('analytics')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get(),
      
      // 投稿データ（最新10件）
      adminDb.collection('posts')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get(),
      
      // 目標設定データ
      adminDb.collection('goalSettings')
        .where('userId', '==', userId)
        .limit(1)
        .get()
    ]);

    const planData = planSnapshot.docs[0]?.data() || null;
    const analyticsData = analyticsSnapshot.docs.map(doc => doc.data());
    const postsData = postsSnapshot.docs.map(doc => doc.data());
    const goalSettings = goalSettingsSnapshot.docs[0]?.data() || null;

    // 最近の活動データ（投稿と分析の統合）
    const recentActivity = [
      ...postsData.map(post => ({ type: 'post', ...post })),
      ...analyticsData.map(analytics => ({ type: 'analytics', ...analytics }))
    ].sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aTime = (a as any).createdAt?.toDate?.() || new Date(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bTime = (b as any).createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    }).slice(0, 5);

    // 使用されていない変数を削除
    console.log('Recent activity count:', recentActivity.length);

    return {
      planData,
      analyticsData,
      postsData,
      goalSettings,
      recentActivity
    };

  } catch (error) {
    console.error('Failed to fetch Instagram data:', error);
    return {};
  }
}

// Instagram専門のAIプロンプトを構築
function buildInstagramAIPrompt(instagramData: InstagramData): string {
  const { planData, analyticsData, postsData, goalSettings, recentActivity } = instagramData;

  let systemPrompt = `あなたはInstagram運用の専門AIアドバイザーです。ユーザーのInstagramアカウント全体を理解し、具体的で実践的なアドバイスを提供してください。

【あなたの役割】
- Instagram運用の専門家として、ユーザーの状況を正確に把握し、最適なアドバイスを提供
- データに基づいた具体的な改善提案
- 実現可能で段階的なアクションプラン
- ポジティブで励ましになる回答

【現在のユーザー状況】`;

  // 運用計画データ
  if (planData) {
    systemPrompt += `

📋 【運用計画】
- 計画名: ${planData.title || '未設定'}
- 目標フォロワー数: ${planData.targetFollowers?.toLocaleString() || '未設定'}人
- 現在のフォロワー数: ${planData.currentFollowers?.toLocaleString() || '未設定'}人
- 計画期間: ${planData.planPeriod || '未設定'}
- ターゲットオーディエンス: ${planData.targetAudience || '未設定'}
- カテゴリ: ${planData.category || '未設定'}
- 戦略: ${planData.strategies?.join(', ') || '未設定'}`;

    if (planData.aiPersona) {
      systemPrompt += `
- AIペルソナ: ${planData.aiPersona.tone || '未設定'}、${planData.aiPersona.style || '未設定'}
- 興味分野: ${planData.aiPersona.interests?.join(', ') || '未設定'}`;
    }

    if (planData.simulation) {
      systemPrompt += `
- 投稿戦略: リール${planData.simulation.postTypes?.reel?.weeklyCount || 0}回/週、フィード${planData.simulation.postTypes?.feed?.weeklyCount || 0}回/週、ストーリー${planData.simulation.postTypes?.story?.weeklyCount || 0}回/週`;
    }
  }

  // 目標設定データ
  if (goalSettings) {
    systemPrompt += `

🎯 【目標設定】
- 週間投稿目標: ${goalSettings.weeklyPostGoal || '未設定'}投稿
- フォロワー増加目標: ${goalSettings.followerGoal || '未設定'}人/月
- 月間投稿目標: ${goalSettings.monthlyPostGoal || '未設定'}投稿`;
  }

  // 最近の分析データ
  if (analyticsData && analyticsData.length > 0) {
    const recentAnalytics = analyticsData.slice(0, 3);
    systemPrompt += `

📊 【最近の分析データ】
${recentAnalytics.map((analytics, index) => `
${index + 1}. リーチ: ${analytics.reach || 0}、いいね: ${analytics.likes || 0}、コメント: ${analytics.comments || 0}
   エンゲージメント率: ${analytics.engagementRate ? analytics.engagementRate.toFixed(2) + '%' : '未計算'}`).join('')}`;
  }

  // 最近の投稿データ
  if (postsData && postsData.length > 0) {
    const recentPosts = postsData.slice(0, 3);
    systemPrompt += `

📝 【最近の投稿】
${recentPosts.map((post, index) => `
${index + 1}. ${post.type || 'フィード'}: ${post.title || post.content?.substring(0, 50) || 'タイトルなし'}...`).join('')}`;
  }

  systemPrompt += `

【回答のガイドライン】
1. 上記のデータを基に、具体的で実践的なアドバイスを提供
2. ユーザーの現在の状況と目標を考慮した改善提案
3. 段階的で実現可能なアクションプラン
4. ポジティブで励ましになるトーン
5. Instagram運用のベストプラクティスに基づいた提案
6. 必要に応じて具体的な数値目標や期限を提案

ユーザーの質問に対して、上記の情報を活用して専門的で実用的な回答を提供してください。`;

  return systemPrompt;
}

// 使用回数を記録
async function recordUsage(userId: string): Promise<void> {
  try {
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const usageRef = adminDb.collection('aiChatUsage').doc(`${userId}-${monthKey}`);
    
    await adminDb.runTransaction(async (transaction) => {
      const usageDoc = await transaction.get(usageRef);
      
      if (!usageDoc.exists) {
        transaction.set(usageRef, {
          userId,
          month: monthKey,
          count: 1,
          lastUsed: today,
          createdAt: today
        });
      } else {
        const currentCount = usageDoc.data()?.count || 0;
        transaction.update(usageRef, {
          count: currentCount + 1,
          lastUsed: today
        });
      }
    });
  } catch (error) {
    console.error('Failed to record usage:', error);
  }
}
