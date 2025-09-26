import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

// 最小限の分析データの型定義
interface SimpleAnalyticsData {
  id: string;
  userId: string;
  likes: number;
  publishedAt: Date;
  createdAt: Date;
}

// 分析データ作成（いいね数のみ）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, likes, publishedAt } = body;

    // バリデーション
    if (!userId || likes === undefined) {
      return NextResponse.json(
        { error: 'userIdとlikesが必要です' },
        { status: 400 }
      );
    }

    // 未使用の変数を削除

    // Firebase Admin SDKまたはクライアントSDKで保存
    let docRef;
    if (adminDb) {
      // Admin SDK使用
      docRef = await adminDb.collection('analytics').add({
        userId,
        likes: Number(likes) || 0,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        createdAt: new Date()
      });
    } else {
      // クライアントSDK使用（フォールバック）
      docRef = await addDoc(collection(db, 'analytics'), {
        userId,
        likes: Number(likes) || 0,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        createdAt: new Date()
      });
    }

    console.log('Simple analytics data saved:', {
      id: docRef.id,
      userId,
      likes: Number(likes) || 0,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date()
    });

    return NextResponse.json({
      id: docRef.id,
      message: 'いいね数を保存しました',
      data: { 
        id: docRef.id,
        userId,
        likes: Number(likes) || 0,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        createdAt: new Date()
      }
    });

  } catch (error) {
    console.error('Analytics POST error:', error);
    return NextResponse.json(
      { error: 'データの保存に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// 分析データ取得
export async function GET(request: NextRequest) {
  try {
    console.log('=== Analytics GET Debug ===');
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('Request URL:', request.url);
    console.log('User ID from params:', userId);

    if (!userId) {
      console.log('No userId provided');
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    console.log('Creating Firestore query for userId:', userId);
    
    // Firebase Admin SDKまたはクライアントSDKで取得
    let snapshot;
    if (adminDb) {
      // Admin SDK使用
      snapshot = await adminDb.collection('analytics')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
    } else {
      // クライアントSDK使用（フォールバック）
      const q = query(
        collection(db, 'analytics'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      snapshot = await getDocs(q);
    }

    console.log('Query executed successfully, docs count:', snapshot.docs.length);
    
    const analyticsData: SimpleAnalyticsData[] = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Document data:', { id: doc.id, data });
      return {
        id: doc.id,
        ...data
      } as SimpleAnalyticsData;
    });

    console.log('Analytics data retrieved successfully:', {
      userId,
      totalRecords: analyticsData.length,
      sampleData: analyticsData[0]
    });

    return NextResponse.json({
      analytics: analyticsData,
      total: analyticsData.length,
      message: '分析データを取得しました'
    });

  } catch (error) {
    console.error('Analytics GET error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: '分析データの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
