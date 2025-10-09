import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

// X分析データの型定義
interface XAnalyticsData {
  id?: string;
  userId: string;
  postId?: string | null;
  // X特有のメトリクス
  likes: number;
  retweets: number;
  comments: number;
  saves: number;
  impressions: number;
  engagements: number;
  detailClicks: number;
  profileClicks: number;
  // 投稿情報
  publishedAt: string;
  publishedTime: string;
  title: string;
  content: string;
  hashtags: string;
  imageThumbnail: string;
  // 分析データ
  engagementRate: number;
  audience: {
    gender: {
      male: number;
      female: number;
      other: number;
    };
    age: {
      '13-17': number;
      '18-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55-64': number;
      '65+': number;
    };
  };
  reachSource: {
    sources: {
      home: number;
      profile: number;
      explore: number;
      search: number;
      other: number;
    };
    followers: {
      followers: number;
      nonFollowers: number;
    };
  };
  sentiment?: 'satisfied' | 'dissatisfied' | null;
  sentimentMemo?: string;
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    console.log('X Analytics GET request started');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('Request URL:', request.url);
    console.log('User ID from params:', userId);

    if (!userId) {
      console.log('No userId provided, returning 400');
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log('Fetching X analytics for userId:', userId);

    // 本番環境でFirebase設定がない場合は空の配列を返す
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.log('Firebase API key not found in production, returning empty X analytics');
      return NextResponse.json({
        analytics: [],
        total: 0
      });
    }

    console.log('Creating Firebase query...');
    const snapshot = await adminDb
      .collection('xanalytics')
      .where('userId', '==', userId)
      .get();
    
    console.log('Firebase query completed, snapshot size:', snapshot.size);
    
    const analytics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Fetched X analytics from xanalytics collection:', analytics.length, 'records');

    return NextResponse.json({
      analytics,
      total: snapshot.size
    });

  } catch (error) {
    console.error('X Analytics fetch error details:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch X analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
      retweets,
      comments,
      saves,
      impressions,
      engagements,
      detailClicks,
      profileClicks,
      publishedAt,
      publishedTime,
      title,
      content,
      hashtags,
      imageThumbnail,
      audience,
      reachSource,
      sentiment,
      sentimentMemo
    } = body;

    // バリデーション
    if (!userId || !impressions) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // エンゲージメント率を計算
    const totalEngagement = Number(likes) + Number(retweets) + Number(comments) + Number(saves);
    const engagementRate = Number(impressions) > 0 ? (totalEngagement / Number(impressions)) * 100 : 0;

    const analyticsData: Omit<XAnalyticsData, 'id'> = {
      userId,
      postId: postId || null,
      likes: Number(likes),
      retweets: Number(retweets),
      comments: Number(comments),
      saves: Number(saves),
      impressions: Number(impressions),
      engagements: Number(engagements),
      detailClicks: Number(detailClicks),
      profileClicks: Number(profileClicks),
      publishedAt,
      publishedTime,
      title: title || '',
      content: content || '',
      hashtags: hashtags || '',
      imageThumbnail: imageThumbnail || '',
      engagementRate,
      audience: audience || {
        gender: { male: 0, female: 0, other: 0 },
        age: { '13-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 }
      },
      reachSource: reachSource || {
        sources: { home: 0, profile: 0, explore: 0, search: 0, other: 0 },
        followers: { followers: 0, nonFollowers: 0 }
      },
      sentiment: sentiment || null,
      sentimentMemo: sentimentMemo || '',
      createdAt: new Date()
    };

    console.log('Saving X analytics data:', analyticsData);

    const docRef = await adminDb.collection('xanalytics').add(analyticsData);

    console.log('X Analytics saved successfully:', {
      id: docRef.id,
      userId: analyticsData.userId,
      engagementRate: analyticsData.engagementRate
    });

    // x_postsコレクションにも投稿データを保存
    try {
      const postData = {
        userId,
        title: title || '分析済み投稿',
        content: content || '',
        hashtags: hashtags ? hashtags.split(' ').filter((tag: string) => tag.trim()) : [],
        postType: 'tweet',
        scheduledDate: publishedAt,
        scheduledTime: publishedTime,
        status: 'published',
        isAIGenerated: false,
        imageUrl: imageThumbnail || null,
        imageData: null,
        source: 'analytics',
        isAnalyzed: true,
        analyticsData: {
          likes: Number(likes),
          retweets: Number(retweets),
          comments: Number(comments),
          saves: Number(saves),
          impressions: Number(impressions),
          engagements: Number(engagements)
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const postDocRef = await adminDb.collection('x_posts').add(postData);
      console.log('X Post saved successfully:', postDocRef.id);

      // analyticsデータのpostIdを更新
      await adminDb.collection('xanalytics').doc(docRef.id).update({
        postId: postDocRef.id
      });

    } catch (error) {
      console.error('Failed to save X post data:', error);
      // 投稿の保存に失敗してもanalytics保存は成功しているので続行
    }

    // X投稿にanalyticsデータをリンク（postIdがある場合）
    if (postId) {
      try {
        const postDocRef = doc(db, 'xposts', postId);
        await updateDoc(postDocRef, {
          analytics: {
            likes: analyticsData.likes,
            retweets: analyticsData.retweets,
            comments: analyticsData.comments,
            impressions: analyticsData.impressions,
            engagementRate: analyticsData.engagementRate,
            publishedAt: new Date(analyticsData.publishedAt)
          },
          status: 'published',
          updatedAt: new Date()
        });
        console.log('X Post analytics updated successfully for postId:', postId);
      } catch (error) {
        console.error('Failed to update X post analytics:', error);
        // 投稿の更新に失敗してもanalytics保存は成功しているので続行
      }
    }

    return NextResponse.json({
      id: docRef.id,
      message: 'X Analytics data saved successfully',
      engagementRate: analyticsData.engagementRate,
      data: { ...analyticsData, id: docRef.id }
    });

  } catch (error) {
    console.error('X Analytics save error:', error);
    return NextResponse.json(
      { error: 'Failed to save X analytics data' },
      { status: 500 }
    );
  }
}
