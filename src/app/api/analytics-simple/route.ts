import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

// 分析データの型定義
interface AnalyticsData {
  id: string;
  postId: string;
  userId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
  profileClicks?: number;
  websiteClicks?: number;
  storyViews?: number;
  followerChange?: number;
  publishedAt: Date;
  createdAt: Date;
}

// 分析データ作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      postId,
      userId,
      likes,
      comments,
      shares,
      reach,
      engagementRate,
      profileClicks,
      websiteClicks,
      storyViews,
      followerChange,
      publishedAt
    } = body;

    // バリデーション
    if (!postId || !userId) {
      return NextResponse.json(
        { error: 'postIdとuserIdが必要です' },
        { status: 400 }
      );
    }

    const newAnalyticsData: AnalyticsData = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      postId,
      userId,
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      shares: parseInt(shares) || 0,
      reach: parseInt(reach) || 0,
      engagementRate: parseFloat(engagementRate) || 0,
      profileClicks: parseInt(profileClicks) || 0,
      websiteClicks: parseInt(websiteClicks) || 0,
      storyViews: parseInt(storyViews) || 0,
      followerChange: parseInt(followerChange) || 0,
      publishedAt: new Date(publishedAt),
      createdAt: new Date()
    };

    // Firebaseに保存
    const docRef = await addDoc(collection(db, 'analytics'), newAnalyticsData);

    console.log('Analytics data saved to Firebase:', {
      id: docRef.id,
      data: newAnalyticsData
    });

    return NextResponse.json({
      id: docRef.id,
      message: '分析データが保存されました',
      data: { ...newAnalyticsData, id: docRef.id }
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
    const limit = searchParams.get('limit');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // Firebaseから取得
    let q = query(
      collection(db, 'analytics'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (postId) {
      q = query(q, where('postId', '==', postId));
    }

    const snapshot = await getDocs(q);
    let filteredData: AnalyticsData[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AnalyticsData));

    // リミット適用
    if (limit) {
      filteredData = filteredData.slice(0, parseInt(limit));
    }

    console.log('Analytics data retrieved from Firebase:', {
      userId,
      totalRecords: filteredData.length,
      sampleData: filteredData[0]
    });

    return NextResponse.json({
      analytics: filteredData,
      total: filteredData.length,
      message: '分析データを取得しました'
    });

  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { error: '分析データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
