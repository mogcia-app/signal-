import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

// シンプルな分析データAPI（すべてを1つのファイルで処理）

// 分析データ作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Analytics POST request:', body);

    const analyticsData = {
      postId: body.postId,
      userId: body.userId,
      likes: parseInt(body.likes) || 0,
      comments: parseInt(body.comments) || 0,
      shares: parseInt(body.shares) || 0,
      reach: parseInt(body.reach) || 0,
      engagementRate: parseFloat(body.engagementRate) || 0,
      profileClicks: parseInt(body.profileClicks) || 0,
      websiteClicks: parseInt(body.websiteClicks) || 0,
      storyViews: parseInt(body.storyViews) || 0,
      followerChange: parseInt(body.followerChange) || 0,
      publishedAt: new Date(body.publishedAt),
      createdAt: new Date()
    };

    console.log('Saving to Firebase:', analyticsData);
    const docRef = await addDoc(collection(db, 'analytics'), analyticsData);
    console.log('Saved with ID:', docRef.id);

    return NextResponse.json({
      id: docRef.id,
      message: '分析データが保存されました',
      data: { ...analyticsData, id: docRef.id }
    });

  } catch (error) {
    console.error('Analytics POST error:', error);
    return NextResponse.json(
      { error: '分析データの保存に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// 分析データ取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const postId = searchParams.get('postId');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('Analytics GET request:', { userId, postId, limit });

    let q = query(collection(db, 'analytics'), orderBy('createdAt', 'desc'));

    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    if (postId) {
      q = query(q, where('postId', '==', postId));
    }

    const snapshot = await getDocs(q);
    const analytics = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Fetched analytics:', analytics.length, 'records');

    return NextResponse.json({
      analytics,
      total: snapshot.size
    });

  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({
      analytics: [],
      total: 0
    });
  }
}
