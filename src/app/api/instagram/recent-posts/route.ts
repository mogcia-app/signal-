import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 401 });
    }

    // 最近の投稿を取得（過去30日、最大10件）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const postsQuery = await adminDb
      .collection('posts')
      .where('userId', '==', userId)
      .where('status', '==', 'published')
      .where('createdAt', '>=', thirtyDaysAgo)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    // 分析データを取得
    const analyticsQuery = await adminDb
      .collection('analytics')
      .where('userId', '==', userId)
      .get();

    const analyticsMap = new Map();
    analyticsQuery.forEach(doc => {
      const data = doc.data();
      if (data.postId) {
        analyticsMap.set(data.postId, data);
      }
    });

    // 投稿データと分析データを結合
    const recentPosts = postsQuery.docs.map(doc => {
      const postData = doc.data();
      const analytics = analyticsMap.get(doc.id);
      
      // 投稿タイプのアイコンと表示名
      const getPostTypeInfo = (postType: string) => {
        switch (postType) {
          case 'feed': return { icon: '📝', name: 'フィード投稿' };
          case 'reel': return { icon: '🎬', name: 'リール投稿' };
          case 'story': return { icon: '📱', name: 'ストーリー投稿' };
          default: return { icon: '📝', name: '投稿' };
        }
      };

      const typeInfo = getPostTypeInfo(postData.postType || 'feed');
      
      // 投稿時間の計算
      let createdAt = postData.createdAt;
      if (createdAt && createdAt.toDate) {
        createdAt = createdAt.toDate();
      } else if (createdAt && typeof createdAt === 'string') {
        createdAt = new Date(createdAt);
      }

      const timeAgo = createdAt ? getTimeAgo(createdAt) : '時間不明';

      return {
        id: doc.id,
        title: postData.title || typeInfo.name,
        postType: postData.postType || 'feed',
        icon: typeInfo.icon,
        timeAgo: timeAgo,
        likes: analytics?.likes || 0,
        comments: analytics?.comments || 0,
        shares: analytics?.shares || 0,
        reach: analytics?.reach || 0,
        hasAnalytics: !!analytics
      };
    });

    console.log('📋 Recent posts fetched:', {
      userId,
      totalPosts: recentPosts.length,
      postsWithAnalytics: recentPosts.filter(p => p.hasAnalytics).length
    });

    return NextResponse.json({ 
      success: true, 
      data: { posts: recentPosts }
    });

  } catch (error) {
    console.error('Recent posts fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch recent posts' 
    }, { status: 500 });
  }
}

// 時間差を計算する関数
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'たった今';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}時間前`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}日前`;
  } else {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months}ヶ月前`;
  }
}
