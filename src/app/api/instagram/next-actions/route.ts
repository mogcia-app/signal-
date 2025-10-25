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
      // すべての投稿を取得
      const allPostsQuery = await adminDb
        .collection('posts')
        .where('userId', '==', userId)
        .get();

      // 分析済みの投稿IDを取得
      const analyticsQuery = await adminDb
        .collection('analytics')
        .where('userId', '==', userId)
        .get();

      const analyzedPostIds = new Set(analyticsQuery.docs.map(doc => doc.data().postId).filter(Boolean));
      
      // 分析待ちの投稿をカウント（publishedステータスで、分析されていないもの）
      const unanalyzedPosts = allPostsQuery.docs.filter(doc => {
        const postData = doc.data();
        return postData.status === 'published' && !analyzedPostIds.has(doc.id);
      });

      console.log('📊 分析待ち投稿チェック:', {
        totalPosts: allPostsQuery.docs.length,
        analyzedPosts: analyzedPostIds.size,
        unanalyzedPosts: unanalyzedPosts.length,
        analyzedPostIds: Array.from(analyzedPostIds)
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
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 今週の投稿数
        const weeklyPostsQuery = await adminDb
          .collection('posts')
          .where('userId', '==', userId)
          .get();

        const weeklyPostCount = weeklyPostsQuery.docs.filter(doc => {
          const data = doc.data();
          let createdAt = data.createdAt;
          if (createdAt && createdAt.toDate) {
            createdAt = createdAt.toDate();
          } else if (createdAt && typeof createdAt === 'string') {
            createdAt = new Date(createdAt);
          }
          return createdAt && createdAt >= startOfWeek;
        }).length;
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
          .get();

        let totalFollowerIncrease = 0;
        analyticsQuery.forEach(doc => {
          const data = doc.data();
          if (data.followerIncrease) {
            // publishedAtが今月以降かチェック
            let publishedAt = data.publishedAt;
            if (publishedAt && publishedAt.toDate) {
              publishedAt = publishedAt.toDate();
            } else if (publishedAt && typeof publishedAt === 'string') {
              publishedAt = new Date(publishedAt);
            }
            
            if (publishedAt && publishedAt >= startOfMonth) {
              totalFollowerIncrease += parseInt(data.followerIncrease) || 0;
            }
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
        // createdAtを使用して分析データの保存日時から計算
        let lastAnalysisDate = latestAnalytics.createdAt;
        if (lastAnalysisDate && lastAnalysisDate.toDate) {
          lastAnalysisDate = lastAnalysisDate.toDate();
        } else if (lastAnalysisDate && typeof lastAnalysisDate === 'string') {
          lastAnalysisDate = new Date(lastAnalysisDate);
        } else {
          lastAnalysisDate = new Date(latestAnalytics.createdAt);
        }
        
        const daysSinceLastAnalysis = Math.floor((new Date().getTime() - lastAnalysisDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log('📈 分析データ鮮度チェック:', {
          latestAnalyticsId: analyticsQuery.docs[0].id,
          createdAt: latestAnalytics.createdAt,
          lastAnalysisDate: lastAnalysisDate,
          daysSinceLastAnalysis: daysSinceLastAnalysis
        });
        
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

    // 6. エンゲージメント率チェック
    try {
      const analyticsQuery = await adminDb
        .collection('analytics')
        .where('userId', '==', userId)
        .get();

      if (analyticsQuery.size > 0) {
        let totalEngagement = 0;
        let totalReach = 0;
        let postCount = 0;

        analyticsQuery.forEach(doc => {
          const data = doc.data();
          const engagement = (data.likes || 0) + (data.comments || 0) + (data.shares || 0) + (data.saves || 0);
          totalEngagement += engagement;
          totalReach += data.reach || 0;
          postCount++;
        });

        const avgEngagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

        if (avgEngagementRate < 3) {
          actions.push({
            id: 'low_engagement',
            type: 'engagement',
            priority: 'high',
            title: 'エンゲージメント率が低いです',
            description: `現在のエンゲージメント率: ${avgEngagementRate.toFixed(1)}%。コンテンツの質を向上させましょう`,
            actionText: '改善策を見る',
            actionUrl: '/instagram/plan',
            icon: '📈',
            color: 'red'
          });
        } else if (avgEngagementRate < 5) {
          actions.push({
            id: 'medium_engagement',
            type: 'engagement',
            priority: 'medium',
            title: 'エンゲージメント率を向上させましょう',
            description: `現在のエンゲージメント率: ${avgEngagementRate.toFixed(1)}%。さらなる改善の余地があります`,
            actionText: '戦略を確認',
            actionUrl: '/instagram/plan',
            icon: '📊',
            color: 'orange'
          });
        }
      }
    } catch (error) {
      console.error('Engagement rate check error:', error);
    }

    // 7. ハッシュタグ戦略チェック
    try {
      const postsQuery = await adminDb
        .collection('posts')
        .where('userId', '==', userId)
        .where('status', '==', 'published')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      let postsWithoutHashtags = 0;
      let postsWithFewHashtags = 0;

      postsQuery.forEach(doc => {
        const data = doc.data();
        const hashtagCount = data.hashtags ? data.hashtags.length : 0;
        
        if (hashtagCount === 0) {
          postsWithoutHashtags++;
        } else if (hashtagCount < 5) {
          postsWithFewHashtags++;
        }
      });

      if (postsWithoutHashtags > 0) {
        actions.push({
          id: 'no_hashtags',
          type: 'content',
          priority: 'high',
          title: 'ハッシュタグなしの投稿があります',
          description: `${postsWithoutHashtags}件の投稿にハッシュタグが設定されていません`,
          actionText: 'ハッシュタグを追加',
          actionUrl: '/instagram/posts',
          icon: '#️⃣',
          color: 'red'
        });
      } else if (postsWithFewHashtags > 0) {
        actions.push({
          id: 'few_hashtags',
          type: 'content',
          priority: 'medium',
          title: 'ハッシュタグを増やしましょう',
          description: `${postsWithFewHashtags}件の投稿でハッシュタグが少ないです`,
          actionText: 'ハッシュタグ戦略を見る',
          actionUrl: '/instagram/plan',
          icon: '#️⃣',
          color: 'orange'
        });
      }
    } catch (error) {
      console.error('Hashtag strategy check error:', error);
    }

    // 8. 投稿タイプのバランスチェック
    try {
      const postsQuery = await adminDb
        .collection('posts')
        .where('userId', '==', userId)
        .where('status', '==', 'published')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const postTypeCounts: { [key: string]: number } = { feed: 0, reel: 0, story: 0 };
      
      postsQuery.forEach(doc => {
        const data = doc.data();
        const postType = data.postType || 'feed';
        postTypeCounts[postType] = (postTypeCounts[postType] || 0) + 1;
      });

      const totalPosts = postsQuery.size;
      const feedRatio = totalPosts > 0 ? postTypeCounts.feed / totalPosts : 0;
      const reelRatio = totalPosts > 0 ? postTypeCounts.reel / totalPosts : 0;
      const storyRatio = totalPosts > 0 ? postTypeCounts.story / totalPosts : 0;

      if (feedRatio > 0.8) {
        actions.push({
          id: 'too_many_feeds',
          type: 'content',
          priority: 'medium',
          title: 'フィード投稿が多すぎます',
          description: 'リールやストーリーも活用してバランスの良い投稿をしましょう',
          actionText: 'リールを作成',
          actionUrl: '/instagram/lab/reel',
          icon: '🎬',
          color: 'orange'
        });
      } else if (reelRatio === 0 && totalPosts > 5) {
        actions.push({
          id: 'no_reels',
          type: 'content',
          priority: 'medium',
          title: 'リール投稿がありません',
          description: 'リールは高いエンゲージメント率を期待できるコンテンツです',
          actionText: 'リールを作成',
          actionUrl: '/instagram/lab/reel',
          icon: '🎬',
          color: 'blue'
        });
      } else if (storyRatio === 0 && totalPosts > 3) {
        actions.push({
          id: 'no_stories',
          type: 'content',
          priority: 'low',
          title: 'ストーリー投稿がありません',
          description: 'ストーリーでフォロワーとの親近感を高めましょう',
          actionText: 'ストーリーを作成',
          actionUrl: '/instagram/lab/story',
          icon: '📱',
          color: 'blue'
        });
      }
    } catch (error) {
      console.error('Post type balance check error:', error);
    }

    // 9. 投稿時間の最適化チェック
    try {
      const analyticsQuery = await adminDb
        .collection('analytics')
        .where('userId', '==', userId)
        .orderBy('publishedAt', 'desc')
        .limit(10)
        .get();

      if (analyticsQuery.size >= 5) {
        const hourlyPerformance: { [key: number]: { total: number; count: number } } = {};
        
        analyticsQuery.forEach(doc => {
          const data = doc.data();
          const publishedAt = data.publishedAt?.toDate?.() || new Date(data.publishedAt);
          const hour = publishedAt.getHours();
          const engagement = (data.likes || 0) + (data.comments || 0) + (data.shares || 0) + (data.saves || 0);
          
          if (!hourlyPerformance[hour]) {
            hourlyPerformance[hour] = { total: 0, count: 0 };
          }
          hourlyPerformance[hour].total += engagement;
          hourlyPerformance[hour].count += 1;
        });

        // 最もパフォーマンスの良い時間帯を見つける
        let bestHour = null;
        let bestAvgEngagement = 0;
        
        Object.entries(hourlyPerformance).forEach(([hour, data]) => {
          const avgEngagement = data.total / data.count;
          if (avgEngagement > bestAvgEngagement) {
            bestAvgEngagement = avgEngagement;
            bestHour = parseInt(hour);
          }
        });

        if (bestHour !== null) {
          const currentHour = new Date().getHours();
          const timeDiff = Math.abs(currentHour - bestHour);
          
          if (timeDiff > 2) {
            actions.push({
              id: 'optimal_posting_time',
              type: 'timing',
              priority: 'low',
              title: '最適な投稿時間を活用しましょう',
              description: `${bestHour}時台の投稿が最もエンゲージメント率が高いです`,
              actionText: '投稿時間を確認',
              actionUrl: '/instagram/analytics',
              icon: '⏰',
              color: 'blue'
            });
          }
        }
      }
    } catch (error) {
      console.error('Posting time optimization check error:', error);
    }

    // 10. フォロワー成長率チェック
    try {
      const analyticsQuery = await adminDb
        .collection('analytics')
        .where('userId', '==', userId)
        .orderBy('publishedAt', 'desc')
        .limit(7)
        .get();

      if (analyticsQuery.size >= 3) {
        let totalFollowerIncrease = 0;
        let postCount = 0;

        analyticsQuery.forEach(doc => {
          const data = doc.data();
          if (data.followerIncrease) {
            totalFollowerIncrease += parseInt(data.followerIncrease) || 0;
            postCount++;
          }
        });

        const avgDailyGrowth = postCount > 0 ? totalFollowerIncrease / postCount : 0;

        if (avgDailyGrowth < 0) {
          actions.push({
            id: 'follower_decline',
            type: 'growth',
            priority: 'high',
            title: 'フォロワーが減少しています',
            description: '最近の投稿でフォロワーが減っています。コンテンツを見直しましょう',
            actionText: '戦略を見直す',
            actionUrl: '/instagram/plan',
            icon: '📉',
            color: 'red'
          });
        } else if (avgDailyGrowth < 1) {
          actions.push({
            id: 'slow_growth',
            type: 'growth',
            priority: 'medium',
            title: 'フォロワー成長が緩やかです',
            description: 'より魅力的なコンテンツでフォロワー増加を加速させましょう',
            actionText: '成長戦略を確認',
            actionUrl: '/instagram/plan',
            icon: '📈',
            color: 'orange'
          });
        }
      }
    } catch (error) {
      console.error('Follower growth rate check error:', error);
    }

    // 優先度順にソート（high > medium > low）
    const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
    actions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // 最大5件まで返す
    const limitedActions = actions.slice(0, 5);

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
