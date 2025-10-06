import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

interface XSimulationRequest {
  followerGain: number;
  currentFollowers: number;
  planPeriod: string;
  goalCategory: string;
  strategyValues: string[];
  postCategories: string[];
  hashtagStrategy: string;
  referenceAccounts: string;
  userId?: string;
  accountAge?: number;
  currentEngagementRate?: number;
  avgPostsPerWeek?: number;
  contentQuality?: 'low' | 'medium' | 'high';
  niche?: string;
  budget?: number;
  teamSize?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: XSimulationRequest = await request.json();
    const {
      followerGain,
      currentFollowers,
      planPeriod,
      strategyValues,
      userId,
      accountAge = 12,
      currentEngagementRate = 2.5,
      avgPostsPerWeek = 5,
      contentQuality = 'medium',
      budget = 0,
      teamSize = 1
    } = body;

    // バリデーション
    if (!followerGain || !currentFollowers || !planPeriod) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // 期間に基づく計算
    const periodMonths = planPeriod === '1ヶ月' ? 1 : 
                        planPeriod === '3ヶ月' ? 3 : 
                        planPeriod === '6ヶ月' ? 6 : 12;

    // 現実的な成長率の計算（X版の特性を考慮）
    const baseGrowthRate = 0.02; // 月2%の基本成長率
    const qualityMultiplier = contentQuality === 'high' ? 1.5 : 
                             contentQuality === 'medium' ? 1.0 : 0.7;
    const strategyMultiplier = strategyValues.length > 0 ? 1.2 : 1.0;
    const budgetMultiplier = budget > 0 ? 1.3 : 1.0;
    
    const realisticGrowthRate = baseGrowthRate * qualityMultiplier * strategyMultiplier * budgetMultiplier;
    const realisticFinal = Math.round(currentFollowers * Math.pow(1 + realisticGrowthRate, periodMonths));
    const userTargetFinal = currentFollowers + followerGain;

    // 週間目標の計算
    const weeklyTarget = Math.round(followerGain / (periodMonths * 4));
    const monthlyTarget = Math.round(followerGain / periodMonths);

    // 実現可能性の判定
    const feasibilityRatio = realisticFinal / userTargetFinal;
    let feasibilityLevel = '高';
    let feasibilityBadge = '🎯 現実的';
    
    if (feasibilityRatio < 0.5) {
      feasibilityLevel = '低';
      feasibilityBadge = '⚠️ 挑戦的';
    } else if (feasibilityRatio < 0.8) {
      feasibilityLevel = '中';
      feasibilityBadge = '⚡ やや挑戦的';
    }

    // 投稿頻度の推奨（X版の特性を考慮）
    const postsPerWeek = {
      tweet: Math.max(1, Math.round(avgPostsPerWeek * 0.6)), // ツイート中心
      thread: Math.max(0, Math.round(avgPostsPerWeek * 0.2)), // スレッドは少なめ
      reply: Math.max(1, Math.round(avgPostsPerWeek * 0.2))   // リプライで交流
    };

    const monthlyPostCount = (postsPerWeek.tweet + postsPerWeek.thread + postsPerWeek.reply) * 4;

    // ワークロードメッセージ
    const workloadMessage = teamSize === 1 ? 
      '個人運営で管理可能な範囲です' : 
      `チーム運営で効率的に管理できます`;

    // メインアドバイス
    const mainAdvice = `X（旧Twitter）での成長には、一貫性のある投稿と積極的なコミュニティ参加が重要です。ツイートで日常を共有し、スレッドで深い洞察を提供し、リプライでフォロワーとの関係を築きましょう。`;

    // 改善提案（X版に特化）
    const improvementTips = [
      'トレンドハッシュタグを適切に活用する',
      'リプライでフォロワーとの交流を深める',
      'スレッドで価値のある情報を提供する',
      'リアルタイムな情報発信を心がける',
      '業界の議論に積極的に参加する',
      'UGC（ユーザー生成コンテンツ）を活用する',
      '一貫性のあるブランドメッセージを維持する'
    ];

    // グラフデータの生成
    const graphData = {
      data: Array.from({ length: periodMonths * 4 }, (_, i) => ({
        week: `第${i + 1}週`,
        realistic: Math.round(currentFollowers * Math.pow(1 + realisticGrowthRate, (i + 1) / 4)),
        userTarget: Math.round(currentFollowers + (followerGain * (i + 1)) / (periodMonths * 4))
      })),
      realisticFinal,
      userTargetFinal,
      isRealistic: feasibilityRatio >= 0.8,
      growthRateComparison: {
        realistic: Math.round(realisticGrowthRate * 100 * 100) / 100,
        userTarget: Math.round((followerGain / currentFollowers / periodMonths) * 100 * 100) / 100
      }
    };

    // ワンポイントアドバイス
    const onePointAdvice = feasibilityRatio < 0.5 ? {
      type: 'warning' as const,
      title: '目標の見直しを検討',
      message: '現在の目標は非常に挑戦的です。',
      advice: 'より現実的な目標設定や、より長い期間での達成を検討してみてください。'
    } : {
      type: 'success' as const,
      title: '現実的な目標設定',
      message: '設定された目標は達成可能です。',
      advice: '一貫した投稿とコミュニティ参加で目標達成を目指しましょう。'
    };

    const result = {
      targetDate: new Date(Date.now() + periodMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      monthlyTarget,
      weeklyTarget,
      feasibilityLevel,
      feasibilityBadge,
      postsPerWeek,
      monthlyPostCount,
      workloadMessage,
      mainAdvice,
      improvementTips,
      graphData,
      onePointAdvice
    };

    // Xシミュレーション結果をFirestoreに保存
    try {
      await addDoc(collection(db, 'xsimulations'), {
        userId: body.userId || 'anonymous',
        planType: 'xplan',
        requestData: body,
        result: result,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (saveError) {
      console.warn('シミュレーション結果の保存に失敗:', saveError);
      // 保存に失敗してもシミュレーション結果は返す
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('XシミュレーションAPIエラー:', error);
    return NextResponse.json(
      { error: 'シミュレーションの実行に失敗しました' },
      { status: 500 }
    );
  }
}
