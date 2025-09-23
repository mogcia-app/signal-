import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

// ダッシュボード用の統計データ型定義
interface DashboardStats {
  followers: number;
  engagement: number;
  reach: number;
  saves: number;
  likes: number;
  comments: number;
  postsThisWeek: number;
  weeklyGoal: number;
  followerGrowth: number;
  topPostType: string;
  monthlyFeedPosts: number;
  monthlyReelPosts: number;
  monthlyStoryPosts: number;
}

interface PostData {
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
  analytics?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    reach: number;
    engagementRate: number;
    publishedAt: Date;
  };
}

// ダッシュボード統計データ取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // ユーザーの全投稿を取得
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const postsSnapshot = await getDocs(postsQuery);
    const allPosts: PostData[] = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PostData));

    // 公開済み投稿のみをフィルタリング
    const publishedPosts = allPosts.filter(post => 
      post.status === 'published' && post.analytics
    );

    // 統計データを計算
    const totalLikes = publishedPosts.reduce((sum, post) => 
      sum + (post.analytics?.likes || 0), 0
    );
    const totalComments = publishedPosts.reduce((sum, post) => 
      sum + (post.analytics?.comments || 0), 0
    );
    const totalSaves = publishedPosts.reduce((sum, post) => 
      sum + (post.analytics?.shares || 0), 0
    );
    const totalReach = publishedPosts.reduce((sum, post) => 
      sum + (post.analytics?.reach || 0), 0
    );

    // 今週の投稿数
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const postsThisWeek = publishedPosts.filter(post => 
      post.analytics && new Date(post.analytics.publishedAt) >= oneWeekAgo
    ).length;

    // 今月の投稿数（タイプ別）
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const monthlyPosts = publishedPosts.filter(post => 
      post.analytics && new Date(post.analytics.publishedAt) >= oneMonthAgo
    );

    const monthlyFeedPosts = monthlyPosts.filter(post => post.postType === 'feed').length;
    const monthlyReelPosts = monthlyPosts.filter(post => post.postType === 'reel').length;
    const monthlyStoryPosts = monthlyPosts.filter(post => post.postType === 'story').length;

    // エンゲージメント率の計算
    const avgEngagement = publishedPosts.length > 0 
      ? publishedPosts.reduce((sum, post) => sum + (post.analytics?.engagementRate || 0), 0) / publishedPosts.length
      : 0;

    // フォロワー数の推定（実際のAPIから取得する場合はここを変更）
    const estimatedFollowers = 1000 + (totalLikes * 0.1);

    // 人気投稿タイプの計算
    const topPostType = monthlyPosts.length > 0 
      ? (() => {
          const typeCounts = monthlyPosts.reduce((acc, post) => {
            acc[post.postType] = (acc[post.postType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const maxType = Object.entries(typeCounts).reduce((a, b) => 
            typeCounts[a[0]] > typeCounts[b[0]] ? a : b
          );
          return maxType[0] === 'feed' ? 'フィード' : 
                 maxType[0] === 'reel' ? 'リール' : 
                 maxType[0] === 'story' ? 'ストーリーズ' : 'ー';
        })()
      : 'ー';

    const stats: DashboardStats = {
      followers: Math.round(estimatedFollowers),
      engagement: Math.round(avgEngagement * 10) / 10,
      reach: totalReach,
      saves: totalSaves,
      likes: totalLikes,
      comments: totalComments,
      postsThisWeek,
      weeklyGoal: 5,
      followerGrowth: publishedPosts.length > 0 ? 12.5 : 0,
      topPostType,
      monthlyFeedPosts,
      monthlyReelPosts,
      monthlyStoryPosts
    };

    return NextResponse.json({
      stats,
      totalPosts: allPosts.length,
      publishedPosts: publishedPosts.length,
      message: 'ダッシュボード統計データを取得しました'
    });

  } catch (error) {
    console.error('ダッシュボード統計取得エラー:', error);
    return NextResponse.json(
      { error: 'ダッシュボード統計の取得に失敗しました' },
      { status: 500 }
    );
  }
}
