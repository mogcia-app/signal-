import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

    // データ型と範囲の検証
    const likesNumber = Number(likes);
    if (isNaN(likesNumber) || likesNumber < 0 || likesNumber > 10000000) {
      return NextResponse.json(
        { error: 'いいね数は0以上10,000,000以下の数値である必要があります' },
        { status: 400 }
      );
    }

    // クライアントSDKで保存（Firestoreルールで認証チェック）
    const docRef = await addDoc(collection(db, 'analytics'), {
      userId,
      likes: likesNumber,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      createdAt: new Date()
    });

    console.log('Analytics data saved:', {
      id: docRef.id,
      userId,
      likes: likesNumber
    });

    return NextResponse.json({
      id: docRef.id,
      message: 'いいね数を保存しました',
      data: { 
        id: docRef.id,
        userId,
        likes: likesNumber,
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // クライアントSDKで取得（Firestoreルールで認証チェック）
    const q = query(
      collection(db, 'analytics'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const analyticsData: SimpleAnalyticsData[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SimpleAnalyticsData[];

    console.log('Analytics data retrieved:', {
      userId,
      totalRecords: analyticsData.length
    });

    return NextResponse.json({
      analytics: analyticsData,
      total: analyticsData.length,
      message: '分析データを取得しました'
    });

  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { 
        error: '分析データの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
