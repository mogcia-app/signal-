import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 401 });
    }

    const actions = [];

    // 1. 分析待ちの投稿チェック
    try {
      const unanalyzedPostsQuery = await adminDb
        .collection('posts')
        .where('userId', '==', userId)
        .where('status', 'in', ['published', 'created'])
        .get();

      const analyticsQuery = await adminDb
        .collection('analytics')
        .where('userId', '==', userId)
        .get();

      const analyzedPostIds = new Set(analyticsQuery.docs.map(doc => doc.data().postId).filter(Boolean));
      
      const unanalyzedPosts = unanalyzedPostsQuery.docs.filter(doc => {
        const postData = doc.data();
        return !analyzedPostIds.has(doc.id) && postData.status === 'published';
      });

      if (unanalyzedPosts.length > 0) {
        actions.push({
          id: 'unanalyzed_posts',
          type: 'analysis',
          priority: 'high',
          title: `分析待ちの投稿${unanalyzedPosts.length}件あります`,
          description: '投稿のパフォーマンスを分析して改善点を見つけましょう',
          actionText: '分析する',
          actionUrl: '/instagram/analytics',
          icon: '📊',
          color: 'red'
        });
      }
    } catch (error) {
      console.error('Unanalyzed posts check error:', error);
    }

    // 2. 目標達成度チェック
    try {
      const goalDoc = await adminDb.collection('goalSettings').doc(userId).get();
      if (goalDoc.exists) {
        const goalSettings = goalDoc.data();
        if (!goalSettings) {
          console.log('No goal settings data found for user:', userId);
          return;
        }
        
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 今週の投稿数
        const weeklyPostsQuery = await adminDb
          .collection('posts')
          .where('userId', '==', userId)
          .where('createdAt', '>=', startOfWeek)
          .get();

        const weeklyPostCount = weeklyPostsQuery.size;
        const weeklyRemaining = goalSettings.weeklyPostGoal - weeklyPostCount;

        if (weeklyRemaining > 0) {
          actions.push({
            id: 'weekly_goal',
            type: 'goal',
            priority: 'medium',
            title: `週間投稿目標まであと${weeklyRemaining}件`,
            description: '目標達成に向けて投稿を作成しましょう',
            actionText: '投稿を作成',
            actionUrl: '/instagram/lab',
            icon: '📝',
            color: 'orange'
          });
        }

        // フォロワー増加目標
        const analyticsQuery = await adminDb
          .collection('analytics')
          .where('userId', '==', userId)
          .where('publishedAt', '>=', startOfMonth)
          .get();

        let totalFollowerIncrease = 0;
        analyticsQuery.forEach(doc => {
          const data = doc.data();
          if (data.followerIncrease) {
            totalFollowerIncrease += parseInt(data.followerIncrease) || 0;
          }
        });

        const followerRemaining = goalSettings.followerGoal - totalFollowerIncrease;
        if (followerRemaining > 0) {
          actions.push({
            id: 'follower_goal',
            type: 'goal',
            priority: 'medium',
            title: `フォロワー増加目標まであと${followerRemaining}人`,
            description: 'エンゲージメントを向上させてフォロワーを増やしましょう',
            actionText: '戦略を見る',
            actionUrl: '/instagram/plan',
            icon: '👥',
            color: 'blue'
          });
        }
      }
    } catch (error) {
      console.error('Goal progress check error:', error);
    }

    // 3. 投稿頻度チェック
    try {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const recentPostsQuery = await adminDb
        .collection('posts')
        .where('userId', '==', userId)
        .where('createdAt', '>=', lastWeek)
        .get();

      const recentPostCount = recentPostsQuery.size;
      
      if (recentPostCount === 0) {
        actions.push({
          id: 'low_activity',
          type: 'engagement',
          priority: 'high',
          title: '最近の投稿がありません',
          description: '定期的な投稿でフォロワーとのエンゲージメントを維持しましょう',
          actionText: '投稿を作成',
          actionUrl: '/instagram/lab',
          icon: '📱',
          color: 'red'
        });
      } else if (recentPostCount < 3) {
        actions.push({
          id: 'low_frequency',
          type: 'engagement',
          priority: 'medium',
          title: '投稿頻度が低いです',
          description: 'より多くの投稿でフォロワーの関心を維持しましょう',
          actionText: '投稿計画を見る',
          actionUrl: '/instagram/plan',
          icon: '📅',
          color: 'orange'
        });
      }
    } catch (error) {
      console.error('Post frequency check error:', error);
    }

    // 4. 分析データの鮮度チェック
    try {
      const analyticsQuery = await adminDb
        .collection('analytics')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (analyticsQuery.empty) {
        actions.push({
          id: 'no_analytics',
          type: 'analysis',
          priority: 'medium',
          title: '分析データがありません',
          description: '投稿のパフォーマンスを分析して改善点を見つけましょう',
          actionText: '分析を開始',
          actionUrl: '/instagram/analytics',
          icon: '📈',
          color: 'blue'
        });
      } else {
        const latestAnalytics = analyticsQuery.docs[0].data();
        const lastAnalysisDate = latestAnalytics.createdAt?.toDate?.() || new Date(latestAnalytics.createdAt);
        const daysSinceLastAnalysis = Math.floor((new Date().getTime() - lastAnalysisDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastAnalysis > 7) {
          actions.push({
            id: 'stale_analytics',
            type: 'analysis',
            priority: 'medium',
            title: `分析データが${daysSinceLastAnalysis}日前です`,
            description: '最新の投稿パフォーマンスを分析して戦略を見直しましょう',
            actionText: '最新データを分析',
            actionUrl: '/instagram/analytics',
            icon: '🔄',
            color: 'orange'
          });
        }
      }
    } catch (error) {
      console.error('Analytics freshness check error:', error);
    }

    // 5. 投稿予定のチェック
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const scheduledPostsQuery = await adminDb
        .collection('posts')
        .where('userId', '==', userId)
        .where('status', 'in', ['scheduled', 'draft'])
        .where('scheduledDate', '>=', now)
        .where('scheduledDate', '<=', nextWeek)
        .get();

      const scheduledPostCount = scheduledPostsQuery.size;
      
      if (scheduledPostCount === 0) {
        actions.push({
          id: 'no_schedule',
          type: 'planning',
          priority: 'low',
          title: '今週の投稿予定がありません',
          description: '投稿スケジュールを立てて継続的な発信をしましょう',
          actionText: '投稿計画を作成',
          actionUrl: '/instagram/plan',
          icon: '📋',
          color: 'blue'
        });
      }
    } catch (error) {
      console.error('Scheduled posts check error:', error);
    }

    // 優先度順にソート（high > medium > low）
    const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
    actions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // 最大3件まで返す
    const limitedActions = actions.slice(0, 3);

    return NextResponse.json({ 
      success: true, 
      data: { actions: limitedActions }
    });

  } catch (error) {
    console.error('Next actions fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch next actions' 
    }, { status: 500 });
  }
}
