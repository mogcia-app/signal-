import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cache, generateCacheKey } from '../../../../lib/cache';
import { buildReportPrompt } from '../../../../utils/aiPromptBuilder';
import { adminAuth, adminDb } from '../../../../lib/firebase-admin';
import { UserProfile } from '../../../../types/user';

// OpenAI APIの初期化
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// 月次レビューメッセージ生成関数
function generateMonthlyReview(currentScore: number, previousScore: number, performanceRating: string) {
  const scoreDiff = currentScore - previousScore;
  const hasPreviousData = previousScore > 0;
  
  // メッセージパターン（30パターン）
  const messagePatterns = {
    // 大幅成長（+10点以上）
    excellent: [
      {
        title: "🎉 素晴らしい成長月でした！",
        message: `アカウントスコアが${scoreDiff}点向上し、${performanceRating}評価を獲得。投稿の質とエンゲージメントが大幅に改善されました。この調子で継続的な成長を目指しましょう！`
      },
      {
        title: "🚀 驚異的な成長を達成！",
        message: `スコア${scoreDiff}点アップで${performanceRating}評価！投稿戦略が完璧に機能し、フォロワーとのエンゲージメントが劇的に向上。次月もこの勢いを維持しましょう！`
      },
      {
        title: "⭐ 完璧なパフォーマンス！",
        message: `アカウントスコア${scoreDiff}点向上で${performanceRating}評価を獲得。コンテンツの質向上とタイミング最適化が功を奏し、素晴らしい結果を残せました！`
      },
      {
        title: "🏆 最高の月間成績！",
        message: `スコア${scoreDiff}点アップで${performanceRating}評価達成！投稿の一貫性とエンゲージメント戦略が完璧に機能。この成功パターンを継続しましょう！`
      },
      {
        title: "💎 輝かしい成果を収穫！",
        message: `アカウントスコア${scoreDiff}点向上で${performanceRating}評価。ハッシュタグ最適化と投稿時間調整が効果を発揮し、フォロワーとの絆が深まりました！`
      }
    ],
    
    // 良好な成長（+5〜9点）
    good: [
      {
        title: "📈 着実な成長を実現",
        message: `アカウントスコアが${scoreDiff}点向上し、${performanceRating}評価を維持。投稿戦略が効果を発揮し、エンゲージメントが改善されています。さらなる向上を目指して継続しましょう！`
      },
      {
        title: "🌟 順調な成長軌道",
        message: `スコア${scoreDiff}点アップで${performanceRating}評価。コンテンツの質向上とフォロワーとの関係構築が順調に進んでいます。このペースを維持しましょう！`
      },
      {
        title: "🎯 目標達成への道筋",
        message: `アカウントスコア${scoreDiff}点向上で${performanceRating}評価。投稿の一貫性とエンゲージメント戦略が功を奏し、着実に成長しています！`
      },
      {
        title: "💪 堅実なパフォーマンス",
        message: `スコア${scoreDiff}点アップで${performanceRating}評価を獲得。投稿の質とタイミングが改善され、フォロワーとの関係が深まっています！`
      },
      {
        title: "🌱 着実に成長中",
        message: `アカウントスコア${scoreDiff}点向上で${performanceRating}評価。コンテンツ戦略とエンゲージメント最適化が効果を発揮しています！`
      }
    ],
    
    // 軽微な成長（+1〜4点）
    slight: [
      {
        title: "📊 安定したパフォーマンス",
        message: `アカウントスコアは${performanceRating}評価で安定。投稿の質とエンゲージメントが一定水準を維持しています。さらなる成長のために新しいアプローチを試してみましょう！`
      },
      {
        title: "🎨 創造性の向上",
        message: `スコア${scoreDiff}点向上で${performanceRating}評価。コンテンツの多様性とエンゲージメント戦略が徐々に改善されています！`
      },
      {
        title: "🔍 細かな改善を実現",
        message: `アカウントスコア${scoreDiff}点アップで${performanceRating}評価。投稿の質向上とフォロワーとの関係構築が着実に進んでいます！`
      },
      {
        title: "⚡ 継続的な改善",
        message: `スコア${scoreDiff}点向上で${performanceRating}評価を維持。一貫した投稿とエンゲージメント戦略が効果を発揮しています！`
      },
      {
        title: "🎪 エンターテイメント性向上",
        message: `アカウントスコア${scoreDiff}点アップで${performanceRating}評価。コンテンツの魅力とフォロワーとの関係が改善されています！`
      }
    ],
    
    // 維持（±0点）
    stable: [
      {
        title: "⚖️ バランスの取れた運営",
        message: `アカウントスコアは${performanceRating}評価で安定。投稿の質とエンゲージメントが一定水準を維持しています。さらなる成長のために新しいアプローチを試してみましょう！`
      },
      {
        title: "🎭 一貫したブランディング",
        message: `スコア維持で${performanceRating}評価。ブランドアイデンティティとエンゲージメント戦略が安定しています。次のレベルへの挑戦を検討しましょう！`
      },
      {
        title: "🏠 堅固な基盤を構築",
        message: `アカウントスコア${performanceRating}評価で安定。フォロワーとの関係とコンテンツの質が堅実に維持されています！`
      },
      {
        title: "🎪 安定したエンターテイメント",
        message: `スコア維持で${performanceRating}評価。一貫したコンテンツ提供とフォロワーとの関係構築が順調です！`
      },
      {
        title: "🌟 信頼性の確立",
        message: `アカウントスコア${performanceRating}評価で安定。投稿の一貫性とエンゲージメント戦略が信頼できる基盤を築いています！`
      }
    ],
    
    // 軽微な低下（-1〜-4点）
    slightDecline: [
      {
        title: "📉 一時的な調整期",
        message: `アカウントスコアが${Math.abs(scoreDiff)}点低下し、${performanceRating}評価。投稿頻度やエンゲージメント戦略を見直し、来月は巻き返しを図りましょう！`
      },
      {
        title: "🔄 戦略の見直し時期",
        message: `スコア${Math.abs(scoreDiff)}点ダウンで${performanceRating}評価。コンテンツ戦略とエンゲージメント最適化を再検討し、改善を図りましょう！`
      },
      {
        title: "🎯 ターゲット調整中",
        message: `アカウントスコア${Math.abs(scoreDiff)}点低下で${performanceRating}評価。フォロワー層の変化に対応し、新しいアプローチを試してみましょう！`
      },
      {
        title: "💡 イノベーションの機会",
        message: `スコア${Math.abs(scoreDiff)}点ダウンで${performanceRating}評価。この機会に新しいコンテンツ形式やエンゲージメント手法を試してみましょう！`
      },
      {
        title: "🌱 成長のための準備",
        message: `アカウントスコア${Math.abs(scoreDiff)}点低下で${performanceRating}評価。基盤を固め直し、より強固な成長を目指しましょう！`
      }
    ],
    
    // 大幅な低下（-5点以下）
    significantDecline: [
      {
        title: "📉 改善の余地あり",
        message: `アカウントスコアが${Math.abs(scoreDiff)}点低下し、${performanceRating}評価。投稿頻度やエンゲージメント戦略を見直し、来月は巻き返しを図りましょう！`
      },
      {
        title: "🔄 戦略の大幅見直し",
        message: `スコア${Math.abs(scoreDiff)}点ダウンで${performanceRating}評価。コンテンツの方向性とエンゲージメント戦略を根本的に見直し、新しいアプローチを試しましょう！`
      },
      {
        title: "🎯 ターゲット再設定",
        message: `アカウントスコア${Math.abs(scoreDiff)}点低下で${performanceRating}評価。フォロワーのニーズとコンテンツ戦略を再評価し、より効果的なアプローチを検討しましょう！`
      },
      {
        title: "💪 巻き返しのチャンス",
        message: `スコア${Math.abs(scoreDiff)}点ダウンで${performanceRating}評価。この機会に投稿の質向上とエンゲージメント最適化に集中し、来月は大幅な改善を目指しましょう！`
      },
      {
        title: "🚀 新たなスタート",
        message: `アカウントスコア${Math.abs(scoreDiff)}点低下で${performanceRating}評価。新しいコンテンツ戦略とエンゲージメント手法で、より強力なアカウントを構築しましょう！`
      }
    ],
    
    // 初回データ
    firstTime: [
      {
        title: "🚀 新しいスタート",
        message: `初回の分析データで${performanceRating}評価を獲得！これから継続的にデータを蓄積し、アカウントの成長を追跡していきましょう。投稿の質向上とエンゲージメント最適化に取り組んでください。`
      },
      {
        title: "🌟 輝かしい始まり",
        message: `初回分析で${performanceRating}評価を達成！素晴らしいスタートを切れました。継続的な改善とエンゲージメント向上で、さらなる成長を目指しましょう！`
      },
      {
        title: "🎯 目標設定完了",
        message: `初回データで${performanceRating}評価を獲得！明確な目標設定と一貫した投稿戦略で、着実な成長を実現していきましょう！`
      },
      {
        title: "💎 価値あるスタート",
        message: `初回分析で${performanceRating}評価を達成！質の高いコンテンツとエンゲージメント戦略で、価値あるアカウントを構築していきましょう！`
      },
      {
        title: "🎪 エンターテイメント開始",
        message: `初回データで${performanceRating}評価を獲得！魅力的なコンテンツとフォロワーとの関係構築で、楽しいアカウント運営を続けましょう！`
      }
    ]
  };

  // スコア変動に基づいてパターンを選択
  let patternCategory: keyof typeof messagePatterns;
  
  if (!hasPreviousData) {
    patternCategory = 'firstTime';
  } else if (scoreDiff >= 10) {
    patternCategory = 'excellent';
  } else if (scoreDiff >= 5) {
    patternCategory = 'good';
  } else if (scoreDiff >= 1) {
    patternCategory = 'slight';
  } else if (scoreDiff === 0) {
    patternCategory = 'stable';
  } else if (scoreDiff >= -4) {
    patternCategory = 'slightDecline';
  } else {
    patternCategory = 'significantDecline';
  }

  // 月に基づいてパターンを選択（毎月同じパターンになる）
  const patterns = messagePatterns[patternCategory];
  const currentDate = new Date();
  const monthIndex = currentDate.getMonth(); // 0-11
  const selectedIndex = monthIndex % patterns.length;
  
  return patterns[selectedIndex];
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Monthly review API開始');
    
    // Firebase接続確認
    if (!adminDb) {
      console.error('❌ Firebase接続エラー: adminDb is null');
      return NextResponse.json(
        { error: 'Firebase接続エラー' },
        { status: 500 }
      );
    }
    console.log('✅ Firebase接続OK');
    
    // 🔐 Firebase認証トークンからユーザーIDを取得
    let userId = 'anonymous';
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
        console.log('✅ Authenticated user:', userId);
      } catch (authError) {
        console.warn('⚠️ Firebase認証エラー（匿名ユーザーとして処理）:', authError);
      }
    }

    const { searchParams } = new URL(request.url);
    const currentScore = parseInt(searchParams.get('currentScore') || '0');
    const previousScore = parseInt(searchParams.get('previousScore') || '0');
    const performanceRating = searchParams.get('performanceRating') || 'C';

    // キャッシュキー生成（ユーザーIDを含める）
    const cacheKey = generateCacheKey('monthly-review-ai', { userId, currentScore, previousScore, performanceRating });
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('📦 キャッシュから返却');
      return NextResponse.json(cached);
    }

    // OpenAI APIキーのチェック
    if (!openai) {
      // フォールバック: 旧ロジックを使用
      console.warn('⚠️ OpenAI APIキーなし - フォールバックを使用');
      const review = generateMonthlyReview(currentScore, previousScore, performanceRating);
      return NextResponse.json({
        title: review.title,
        message: review.message,
        currentScore,
        previousScore,
        scoreDiff: currentScore - previousScore,
        performanceRating,
        isAIGenerated: false
      });
    }

    // ✅ ユーザープロファイルを取得
    let userProfile: UserProfile | null = null;
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userProfile = userDoc.data() as UserProfile;
        console.log('✅ ユーザープロファイル取得成功');
      }
    } catch (error) {
      console.warn('⚠️ ユーザープロファイル取得エラー:', error);
    }

    if (!userProfile) {
      // フォールバック
      const review = generateMonthlyReview(currentScore, previousScore, performanceRating);
      return NextResponse.json({
        title: review.title,
        message: review.message,
        currentScore,
        previousScore,
        scoreDiff: currentScore - previousScore,
        performanceRating,
        isAIGenerated: false
      });
    }

    // ✅ 運用計画を取得（PDCA - Plan）
    let planSummary = '';
    try {
      const plansSnapshot = await adminDb
        .collection('plans')
        .where('userId', '==', userId)
        .where('snsType', '==', 'instagram')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!plansSnapshot.empty) {
        const plan = plansSnapshot.docs[0].data();
        planSummary = (plan.generatedStrategy as string)?.substring(0, 500) || '';
        console.log('✅ 運用計画取得成功');
      }
    } catch (error) {
      console.warn('⚠️ 運用計画取得エラー:', error);
    }

    // ✅ 投稿データを取得（PDCA - Do）
    const recentPosts: Array<{ title: string; engagement?: number }> = [];
    try {
      const postsSnapshot = await adminDb
        .collection('posts')
        .where('userId', '==', userId)
        .where('platform', '==', 'instagram')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      postsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        recentPosts.push({
          title: data.title || '',
          engagement: undefined // TODO: 分析データと紐付け
        });
      });
      console.log(`✅ 投稿データ取得成功: ${recentPosts.length}件`);
    } catch (error) {
      console.warn('⚠️ 投稿データ取得エラー:', error);
    }

    // ✅ 分析データを取得（PDCA - Check）
    let totalEngagement = 0;
    let totalReach = 0;
    try {
      const analyticsSnapshot = await adminDb
        .collection('analytics')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();

      analyticsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        totalReach += data.reach || 0;
        totalEngagement += (data.likes || 0) + (data.comments || 0) + (data.shares || 0);
      });
      console.log('✅ 分析データ取得成功');
    } catch (error) {
      console.warn('⚠️ 分析データ取得エラー:', error);
    }

    const avgEngagementRate = totalReach > 0 ? (totalEngagement / totalReach * 100) : 0;

    // AI月次レポート生成（エラーハンドリング付き）
    let aiReport;
    try {
      aiReport = await generateAIMonthlyReview(
        userProfile,
        {
          currentScore,
          previousScore,
          performanceRating,
          totalPosts: recentPosts.length,
          totalEngagement,
          avgEngagementRate
        },
        planSummary,
        recentPosts
      );
    } catch (aiError) {
      console.warn('⚠️ AI生成エラー - フォールバックを使用:', aiError);
      // AI生成に失敗した場合はフォールバックを使用
      const review = generateMonthlyReview(currentScore, previousScore, performanceRating);
      aiReport = {
        title: review.title,
        message: review.message,
        metadata: {
          generatedAt: new Date().toISOString(),
          basedOnPlan: planSummary ? true : false,
          postsAnalyzed: recentPosts.length,
          aiError: aiError instanceof Error ? aiError.message : 'Unknown error'
        }
      };
    }

    const result = {
      ...aiReport,
      currentScore,
      previousScore,
      scoreDiff: currentScore - previousScore,
      performanceRating,
      isAIGenerated: true
    };

    // キャッシュに保存（24時間）
    cache.set(cacheKey, result, 24 * 60 * 60 * 1000);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Monthly review API error:', error);
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate monthly review',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// AI月次レポート生成（PDCA - Act）
async function generateAIMonthlyReview(
  userProfile: UserProfile,
  monthlyData: {
    currentScore: number;
    previousScore: number;
    performanceRating: string;
    totalPosts: number;
    totalEngagement: number;
    avgEngagementRate: number;
  },
  planSummary: string,
  recentPosts: Array<{ title: string; engagement?: number }>
) {
  if (!openai) {
    throw new Error('OpenAI API not initialized');
  }

  // ✅ プロンプトビルダーを使用（PDCA - Act）
  const systemPrompt = buildReportPrompt(
    userProfile,
    'instagram',
    monthlyData,
    planSummary,
    recentPosts
  );

  const userPrompt = `
上記のクライアント情報と月次データを基に、今月の総括と来月のアクションプランを生成してください。

前向きで励ましのトーンを使い、具体的で実行可能な提案を行ってください。`;

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponse = chatCompletion.choices[0].message.content || '';

    // タイトルとメッセージを分割
    const lines = aiResponse.split('\n');
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || '📊 今月の振り返り';
    const message = aiResponse;

    return {
      title,
      message,
      metadata: {
        generatedAt: new Date().toISOString(),
        basedOnPlan: planSummary ? true : false,
        postsAnalyzed: recentPosts.length
      }
    };
  } catch (apiError) {
    console.error('❌ OpenAI API呼び出しエラー:', apiError);
    throw new Error(`OpenAI API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
  }
}
