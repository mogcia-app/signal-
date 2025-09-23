import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

// 分析データの型定義
interface AnalyticsData {
  id?: string;
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

    const analyticsData: Omit<AnalyticsData, 'id'> = {
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

    const docRef = await addDoc(collection(db, 'analytics'), analyticsData);
    
    console.log('Analytics data saved to collection:', {
      id: docRef.id,
      postId,
      analyticsData
    });
    
    return NextResponse.json({
      id: docRef.id,
      message: '分析データが保存されました',
      data: { ...analyticsData, id: docRef.id }
    });

  } catch (error) {
    console.error('分析データ保存エラー:', error);
    return NextResponse.json(
      { error: '分析データの保存に失敗しました' },
      { status: 500 }
    );
  }
}

// 分析データ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const postId = searchParams.get('postId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 本番環境でFirebase設定がない場合は空の配列を返す
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.log('Firebase API key not found in production, returning empty analytics');
      return NextResponse.json({
        analytics: [],
        total: 0
      });
    }

    console.log('Firebase API key found, proceeding with analytics query');
    console.log('Query parameters:', { userId, postId, limit });

    let q = query(
      collection(db, 'analytics'),
      orderBy('createdAt', 'desc')
    );

    // フィルタリング
    if (userId) {
      console.log('Filtering by userId:', userId);
      q = query(q, where('userId', '==', userId));
    }
    if (postId) {
      console.log('Filtering by postId:', postId);
      q = query(q, where('postId', '==', postId));
    }

    const snapshot = await getDocs(q);
    const analytics = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Fetched analytics from collection:', analytics.length, 'records');
    console.log('Query result sample:', analytics.slice(0, 2));

    return NextResponse.json({
      analytics,
      total: snapshot.size
    });

  } catch (error) {
    console.error('分析データ取得エラー:', error);
    // エラーが発生した場合は空の配列を返す
    return NextResponse.json({
      analytics: [],
      total: 0
    });
  }
}