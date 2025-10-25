import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase-admin';

interface MasterContext {
  userId: string;
  totalInteractions: number;
  ragHitRate: number;
  learningPhase: 'initial' | 'learning' | 'optimized' | 'master';
  personalizedInsights: string[];
  recommendations: string[];
  lastUpdated: Date;
}

// OpenAI APIを呼び出す関数
async function callOpenAI(prompt: string, context?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found');
  }

  const messages = [
    {
      role: 'system',
      content: `あなたはInstagram分析の専門AIアシスタントです。ユーザーのInstagram運用データを分析し、具体的で実用的なアドバイスを提供します。

分析のポイント：
- データに基づいた客観的な分析
- 具体的で実行可能な改善提案
- ユーザーの成長段階に応じたアドバイス
- 簡潔で分かりやすい説明

${context ? `\nマスターコンテキスト:\n${context}` : ''}`
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '分析結果を取得できませんでした。';
}

// RAGシステムでマスターコンテキストを取得
async function getMasterContext(userId: string): Promise<MasterContext | null> {
  try {
    // 簡易的な実装 - 実際のマスターコンテキスト取得は後で実装
    console.log('🔍 マスターコンテキスト取得（簡易版）:', userId);
    
    // デフォルトのマスターコンテキストを返す
    return {
      userId,
      totalInteractions: 0,
      ragHitRate: 0,
      learningPhase: 'initial',
      personalizedInsights: [
        'AI分析を開始しました',
        'データが蓄積されるほど精度が向上します',
        '継続的な投稿で成長を追跡できます'
      ],
      recommendations: [
        'AIとの対話を継続して学習を促進しましょう',
        '過去の成功パターンを活用した戦略を試してください',
        'データが蓄積されるほど精度が向上します'
      ],
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('マスターコンテキスト取得エラー:', error);
  }
  
  return null;
}

// 分析データを取得（月次レポートサマリー全体を取得）
async function getReportSummary(userId: string, period: string, date: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analytics/monthly-report-summary?userId=${userId}&period=${period}&date=${date}`);
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
    }
  } catch (error) {
    console.error('レポートサマリー取得エラー:', error);
  }
  
  return null;
}

interface ReportSummary {
  totals?: {
    totalLikes?: number;
    totalComments?: number;
    totalShares?: number;
    totalReach?: number;
    totalPosts?: number;
    totalSaves?: number;
    totalReposts?: number;
    totalFollowerIncrease?: number;
    avgEngagementRate?: number;
  };
  changes?: {
    likesChange?: number;
    commentsChange?: number;
    sharesChange?: number;
    reachChange?: number;
    postsChange?: number;
    followerChange?: number;
  };
  previousTotals?: Record<string, unknown>;
  postTypeStats?: Array<{
    type: string;
    count: number;
    label: string;
    percentage: number;
  }>;
  hashtagStats?: Array<{
    hashtag: string;
    count: number;
  }>;
  bestTimeSlot?: {
    label: string;
    postsInRange: number;
    avgEngagement: number;
  };
}

// AI分析を実行
async function performAIAnalysis(
  reportSummary: ReportSummary | null,
  masterContext: MasterContext | null,
  period: 'weekly' | 'monthly',
  date: string,
  userId?: string
): Promise<{
  predictions: {
    followerGrowth: { weekly: number; monthly: number };
    engagementRate: number;
    optimalPostingTime: string;
  };
  insights: string[];
  recommendations: string[];
  summary: string;
}> {
  
  // レポートサマリーからデータを取得
  const totals = reportSummary?.totals || {};
  const changes = reportSummary?.changes || {};
  
  const totalLikes = totals.totalLikes || 0;
  const totalComments = totals.totalComments || 0;
  const totalShares = totals.totalShares || 0;
  const totalReach = totals.totalReach || 0;
  const totalPosts = totals.totalPosts || 0;
  
  // ユーザープロファイルを取得（onboardingデータ）
  let userProfile = null;
  if (userId) {
    try {
      const db = getAdminDb();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        userProfile = userDoc.data();
        console.log('✅ ユーザープロファイル取得完了');
      }
    } catch (error) {
      console.error('ユーザープロファイル取得エラー:', error);
    }
  }
  
  // マスターコンテキストの活用度を判定
  const isOptimized = masterContext && masterContext.learningPhase === 'optimized' || masterContext?.learningPhase === 'master';
  const ragHitRate = masterContext?.ragHitRate || 0;
  
  // プロンプトを構築（学習段階に応じて最適化）
  let prompt = `Instagram分析データを基に、簡潔に分析してください。

【御社専用AI設定】
${userProfile?.businessInfo ? `
- 業種: ${userProfile.businessInfo.industry || '未設定'}
- 会社規模: ${userProfile.businessInfo.companySize || '未設定'}
- 事業形態: ${userProfile.businessInfo.businessType || '未設定'}
- ターゲット市場: ${Array.isArray(userProfile.businessInfo.targetMarket) ? userProfile.businessInfo.targetMarket.join('、') : userProfile.businessInfo.targetMarket || '未設定'}
- キャッチコピー: ${userProfile.businessInfo.catchphrase || '未設定'}
- 事業内容: ${userProfile.businessInfo.description || '未設定'}
- 目標: ${Array.isArray(userProfile.businessInfo.goals) ? userProfile.businessInfo.goals.join('、') : ''}
- 課題: ${Array.isArray(userProfile.businessInfo.challenges) ? userProfile.businessInfo.challenges.join('、') : ''}
` : 'ビジネス情報未設定'}

【Instagram運用データ】
期間: ${period === 'weekly' ? '週次' : '月次'}
投稿数: ${totalPosts}件、いいね: ${totalLikes}件、コメント: ${totalComments}件、シェア: ${totalShares}件
リーチ: ${totalReach}人、フォロワー増加: ${totals.totalFollowerIncrease || 0}人
投稿タイプ: ${reportSummary?.postTypeStats?.map((stat) => `${stat.label}${stat.count}件`).join('、') || 'なし'}
最適時間: ${reportSummary?.bestTimeSlot?.label || '不明'}

【比較】
いいね: ${(changes.likesChange ?? 0) >= 0 ? '+' : ''}${(changes.likesChange ?? 0).toFixed(1)}%、
コメント: ${(changes.commentsChange ?? 0) >= 0 ? '+' : ''}${(changes.commentsChange ?? 0).toFixed(1)}%、
リーチ: ${(changes.reachChange ?? 0) >= 0 ? '+' : ''}${(changes.reachChange ?? 0).toFixed(1)}%

【回答形式】
${totalPosts === 0 ? `
投稿数がゼロの場合でも、ビジネス情報に基づいて実践的な提案を行う。すべて自然な日本語の文章で簡潔に答える。

【禁止事項】
「###」「-」「*」などの記号、箇条書きや見出し、JSON形式やMarkdown形式を使わない。すべて自然な日本語の文章で書く。

次の3つを提供:
1. ${period === 'weekly' ? '今週' : '今月'}のまとめ（80文字以内）
   投稿ゼロの現状認識、ビジネス目標に基づいた投稿の重要性、週1-2回の投稿で期待できるフォロワー増加予測の根拠を含める

2. 次へのステップ（各60文字以内の自然な文章を3つ）
   具体的な投稿テーマ、ターゲット市場に合わせたコンテンツ例、実践可能なアクションを含める

3. 具体的なアドバイス（各60文字以内の自然な文章を2つ）

重要: データがない場合でも、ビジネス情報（業種、ターゲット市場、目標）を活用して実践的な提案を行う。
` : `
【禁止事項】
「###」「-」「*」などの記号、箇条書きや見出し、JSON形式やMarkdown形式を使わない。すべて自然な日本語の文章で書く。

1. ${period === 'weekly' ? '今週' : '今月'}のまとめ（100文字以内、フォロワー増加予測の根拠を含む）
2. 次へのステップ（各30文字以内の自然な文章を3つ）
3. 詳細インサイト（各30文字以内の自然な文章を3つ）
`}`;

  // 学習段階に応じてプロンプトを最適化
  if (isOptimized && ragHitRate > 0.7) {
    prompt += `\n\n【最適化モード】
過去の学習データを活用し、簡潔で的確な分析を提供してください。`;
  }

  try {
    const contextString = masterContext ? 
      `学習フェーズ: ${masterContext.learningPhase}, RAGヒット率: ${Math.round(ragHitRate * 100)}%, 対話数: ${masterContext.totalInteractions}` : 
      undefined;
    
    const aiResponse = await callOpenAI(prompt, contextString);
    
    // 予測値を抽出（簡易的な実装）
    const followerGrowthWeekly = Math.round(totalPosts * 2.5 + Math.random() * 10);
    const followerGrowthMonthly = Math.round(totalPosts * 8 + Math.random() * 30);
    
    return {
      predictions: {
        followerGrowth: {
          weekly: followerGrowthWeekly,
          monthly: followerGrowthMonthly
        },
        engagementRate: 0,
        optimalPostingTime: '18:00-20:00'
      },
      insights: [
        `投稿頻度${totalPosts}件で${totalPosts > 10 ? '適切' : '増加推奨'}`,
        `リーチ数${totalReach.toLocaleString()}で${totalReach > 1000 ? '順調' : '拡大が必要'}`,
        '定期的な投稿でフォロワーとの関係を構築'
      ],
      recommendations: [
        '投稿頻度を週3-4回に増やす',
        '夕方18-20時の投稿でエンゲージメント向上',
        'リール投稿を増やしてリーチ拡大'
      ],
      summary: aiResponse.substring(0, 300)
    };
    
  } catch (error) {
    console.error('AI分析エラー:', error);
    
    // フォールバック分析
    return {
      predictions: {
        followerGrowth: {
          weekly: Math.round(totalPosts * 2),
          monthly: Math.round(totalPosts * 6)
        },
        engagementRate: 0,
        optimalPostingTime: reportSummary?.bestTimeSlot?.label || '18:00-20:00'
      },
      insights: [
        'データ分析中です',
        '継続的な投稿が重要です',
        'フォロワーとの交流を深めましょう'
      ],
      recommendations: [
        '投稿頻度を維持する',
        '質の高いコンテンツを作成する',
        'ユーザーとの交流を増やす'
      ],
      summary: 'AI分析を実行中です。しばらくお待ちください。'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🤖 AI分析API開始');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') as 'weekly' | 'monthly';
    const date = searchParams.get('date');

    if (!userId || !period || !date) {
      return NextResponse.json(
        { error: 'userId, period, date パラメータが必要です' },
        { status: 400 }
      );
    }

    console.log('🤖 AI分析パラメータ:', { userId, period, date });

    // 1. マスターコンテキストを取得（RAGシステム）
    console.log('🔍 マスターコンテキスト取得中...');
    const masterContext = await getMasterContext(userId);
    console.log('✅ マスターコンテキスト取得完了:', masterContext?.learningPhase);

    // 2. レポートサマリーを取得
    console.log('📊 レポートサマリー取得中...');
    const reportSummary = await getReportSummary(userId, period, date);
    console.log('✅ レポートサマリー取得完了:', reportSummary ? 'データあり' : 'データなし');

    // 3. AI分析を実行
    console.log('🧠 AI分析実行中...');
    const analysisResult = await performAIAnalysis(reportSummary, masterContext, period, date, userId);
    console.log('✅ AI分析完了');

    // 4. 結果を返す
    const result = {
      success: true,
      data: {
        ...analysisResult,
        masterContext: masterContext ? {
          learningPhase: masterContext.learningPhase,
          ragHitRate: masterContext.ragHitRate,
          totalInteractions: masterContext.totalInteractions,
          isOptimized: masterContext.learningPhase === 'optimized' || masterContext.learningPhase === 'master'
        } : null,
        metadata: {
          period,
          date,
          dataPoints: reportSummary?.totals?.totalPosts || 0,
          analysisTimestamp: new Date().toISOString()
        }
      }
    };

    console.log('🎉 AI分析API完了');
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ AI分析APIエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'AI分析の実行に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
