import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';

// 分析データの型定義
interface AnalyticsData {
  id?: string;
  userId: string;
  postId?: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  saves: number;
  followerIncrease: number;
  publishedAt: string;
  publishedTime: string;
  title: string;
  content: string;
  hashtags: string;
  thumbnail: string;
  category: string;
  engagementRate: number;
  audience: {
    gender: {
      male: string;
      female: string;
      other: string;
    };
    age: {
      '13-17': string;
      '18-24': string;
      '25-34': string;
      '35-44': string;
      '45-54': string;
      '55-64': string;
      '65+': string;
    };
  };
  reachSource: {
    sources: {
      posts: string;
      profile: string;
      explore: string;
      search: string;
      other: string;
    };
    followers: {
      followers: string;
      nonFollowers: string;
    };
  };
  sentiment?: 'satisfied' | 'dissatisfied' | null;
  sentimentMemo?: string;
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log('Fetching analytics for userId:', userId);

    // 本番環境でFirebase設定がない場合は空の配列を返す
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.log('Firebase API key not found in production, returning empty analytics');
      return NextResponse.json({
        analytics: [],
        total: 0
      });
    }

    const q = query(
      collection(db, 'analytics'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const analytics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Fetched analytics from collection:', analytics.length, 'records');

    return NextResponse.json({
      analytics,
      total: snapshot.size
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      postId,
      likes,
      comments,
      shares,
      reach,
      saves,
      followerIncrease,
      publishedAt,
      publishedTime,
      title,
      content,
      hashtags,
      thumbnail,
      category,
      audience,
      reachSource,
      sentiment,
      sentimentMemo
    } = body;

    // バリデーション
    if (!userId || !likes || !reach) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // エンゲージメント率を計算
    const totalEngagement = Number(likes) + Number(comments) + Number(shares);
    const engagementRate = Number(reach) > 0 ? (totalEngagement / Number(reach)) * 100 : 0;

    const analyticsData: Omit<AnalyticsData, 'id'> = {
      userId,
      postId: postId || null,
      likes: Number(likes),
      comments: Number(comments),
      shares: Number(shares),
      reach: Number(reach),
      saves: Number(saves),
      followerIncrease: Number(followerIncrease),
      publishedAt,
      publishedTime,
      title: title || '',
      content: content || '',
      hashtags: hashtags || '',
      thumbnail: thumbnail || '',
      category: category || 'feed',
      engagementRate,
      audience: audience || {
        gender: { male: '', female: '', other: '' },
        age: { '13-17': '', '18-24': '', '25-34': '', '35-44': '', '45-54': '', '55-64': '', '65+': '' }
      },
      reachSource: reachSource || {
        sources: { posts: '', profile: '', explore: '', search: '', other: '' },
        followers: { followers: '', nonFollowers: '' }
      },
      sentiment: sentiment || null,
      sentimentMemo: sentimentMemo || '',
      createdAt: new Date()
    };

    console.log('Saving analytics data:', analyticsData);

    const docRef = await addDoc(collection(db, 'analytics'), analyticsData);

    console.log('Analytics saved successfully:', {
      id: docRef.id,
      userId: analyticsData.userId,
      engagementRate: analyticsData.engagementRate
    });

    // 投稿にanalyticsデータをリンク（postIdがある場合）
    if (postId) {
      try {
        const postDocRef = doc(db, 'posts', postId);
        await updateDoc(postDocRef, {
          analytics: {
            likes: analyticsData.likes,
            comments: analyticsData.comments,
            shares: analyticsData.shares,
            reach: analyticsData.reach,
            engagementRate: analyticsData.engagementRate,
            publishedAt: new Date(analyticsData.publishedAt)
          },
          status: 'published',
          updatedAt: new Date()
        });
        console.log('Post analytics updated successfully for postId:', postId);
      } catch (error) {
        console.error('Failed to update post analytics:', error);
        // 投稿の更新に失敗してもanalytics保存は成功しているので続行
      }
    }

    return NextResponse.json({
      id: docRef.id,
      message: 'Analytics data saved successfully',
      engagementRate: analyticsData.engagementRate,
      data: { ...analyticsData, id: docRef.id }
    });

  } catch (error) {
    console.error('Analytics save error:', error);
    return NextResponse.json(
      { error: 'Failed to save analytics data' },
      { status: 500 }
    );
  }
}