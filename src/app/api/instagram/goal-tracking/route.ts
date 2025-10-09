import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface GoalProgress {
  title: string;
  current: number;
  target: number;
  unit: string;
  status: 'achieved' | 'in_progress' | 'not_started';
  progressPercentage: number;
  description: string;
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 目標達成追跡API呼び出し:', { userId });

    // 今週の開始日と終了日を計算
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // 今月の開始日と終了日を計算
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 投稿データを取得
    const postsSnapshot = await adminDb
      .collection('posts')
      .where('userId', '==', userId)
      .where('status', '==', 'published')
      .get();
    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
    })) as Array<{
      id: string;
      userId: string;
      title: string;
      content: string;
      hashtags: string[];
      postType: 'feed' | 'reel' | 'story';
      scheduledDate?: string;
      scheduledTime?: string;
      status: 'draft' | 'scheduled' | 'published';
      imageUrl?: string | null;
      imageData?: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;

    // アナリティクスデータを取得
    const analyticsSnapshot = await adminDb
      .collection('analytics')
      .where('userId', '==', userId)
      .get();
    const analytics = analyticsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      publishedAt: doc.data().publishedAt?.toDate ? doc.data().publishedAt.toDate() : new Date(doc.data().publishedAt)
    })) as Array<{
      id: string;
      postId: string | null;
      userId: string;
      likes: number;
      comments: number;
      shares: number;
      reach: number;
      saves?: number;
      followerChange?: number;
      publishedAt: Date;
      publishedTime?: string;
      createdAt: Date;
      hashtags?: string[];
      category?: string;
    }>;

    // 今週の投稿数を計算
    const postsThisWeek = posts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= startOfWeek && postDate <= endOfWeek;
    }).length;

    // 今月の投稿数を計算
    const postsThisMonth = posts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= startOfMonth && postDate <= endOfMonth;
    }).length;


    // フォロワー増加率を計算
    const followerChanges = analytics
      .filter(analytic => analytic.followerChange !== undefined)
      .map(analytic => analytic.followerChange!);
    const followerGrowth = followerChanges.length > 0 
      ? followerChanges.reduce((sum, change) => sum + change, 0) 
      : 0;

    // 目標達成状況を計算
    const goals: GoalProgress[] = [
      {
        title: '週間投稿目標',
        current: postsThisWeek,
        target: 5,
        unit: '件',
        status: postsThisWeek >= 5 ? 'achieved' : (postsThisWeek > 0 ? 'in_progress' : 'not_started'),
        progressPercentage: Math.min((postsThisWeek / 5) * 100, 100),
        description: '週に5件の投稿を目標としています'
      },
      {
        title: 'フォロワー増加',
        current: Math.round(followerGrowth * 10) / 10,
        target: 10,
        unit: '人',
        status: followerGrowth >= 10 ? 'achieved' : (followerGrowth > 0 ? 'in_progress' : 'not_started'),
        progressPercentage: Math.min((followerGrowth / 10) * 100, 100),
        description: '月間で10人のフォロワー増加を目標としています'
      },
      {
        title: '月間投稿目標',
        current: postsThisMonth,
        target: 20,
        unit: '件',
        status: postsThisMonth >= 20 ? 'achieved' : (postsThisMonth > 0 ? 'in_progress' : 'not_started'),
        progressPercentage: Math.min((postsThisMonth / 20) * 100, 100),
        description: '月に20件の投稿を目標としています'
      }
    ];

    // 全体の進捗を計算
    const totalGoals = goals.length;
    const achievedGoals = goals.filter(goal => goal.status === 'achieved').length;
    const overallProgress = (achievedGoals / totalGoals) * 100;

    console.log('✅ 目標達成追跡完了:', {
      totalGoals,
      achievedGoals,
      overallProgress: Math.round(overallProgress * 100) / 100
    });

    return NextResponse.json({
      success: true,
      data: {
        goals,
        summary: {
          totalGoals,
          achievedGoals,
          inProgressGoals: goals.filter(goal => goal.status === 'in_progress').length,
          notStartedGoals: goals.filter(goal => goal.status === 'not_started').length,
          overallProgress: Math.round(overallProgress * 100) / 100
        },
        period: {
          week: { start: startOfWeek.toISOString(), end: endOfWeek.toISOString() },
          month: { start: startOfMonth.toISOString(), end: endOfMonth.toISOString() }
        }
      }
    });

  } catch (error) {
    console.error('❌ 目標達成追跡エラー:', error);
    return NextResponse.json(
      { 
        error: '目標達成追跡の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
