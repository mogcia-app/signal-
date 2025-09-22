import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

// 計画データの型定義
interface PlanData {
  id?: string;
  userId: string;
  title: string;
  targetFollowers: number;
  currentFollowers: number;
  planPeriod: string;
  targetAudience: string;
  category: string;
  strategies: string[];
  createdAt: Date;
  updatedAt: Date;
  
  simulation: {
    postTypes: {
      reel: { weeklyCount: number; followerEffect: number };
      feed: { weeklyCount: number; followerEffect: number };
      story: { weeklyCount: number; followerEffect: number };
    };
  };
  
  aiPersona: {
    tone: string;
    style: string;
    personality: string;
    interests: string[];
  };
}

// 計画作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      title,
      targetFollowers,
      currentFollowers,
      planPeriod,
      targetAudience,
      category,
      strategies,
      simulation,
      aiPersona
    } = body;

    // バリデーション
    if (!userId || !title || !targetFollowers || !currentFollowers) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    const planData: Omit<PlanData, 'id'> = {
      userId,
      title,
      targetFollowers: parseInt(targetFollowers),
      currentFollowers: parseInt(currentFollowers),
      planPeriod: planPeriod || '6ヶ月',
      targetAudience: targetAudience || '未設定',
      category: category || '未設定',
      strategies: strategies || [],
      simulation: simulation || {
        postTypes: {
          reel: { weeklyCount: 1, followerEffect: 3 },
          feed: { weeklyCount: 2, followerEffect: 2 },
          story: { weeklyCount: 3, followerEffect: 1 }
        }
      },
      aiPersona: aiPersona || {
        tone: '親しみやすい',
        style: 'カジュアル',
        personality: '明るく前向き',
        interests: ['成長', 'コミュニティ', 'エンゲージメント', 'クリエイティブ']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'plans'), planData);
    
    return NextResponse.json({
      id: docRef.id,
      message: '計画が保存されました',
      data: { ...planData, id: docRef.id }
    });

  } catch (error) {
    console.error('計画作成エラー:', error);
    return NextResponse.json(
      { error: '計画の保存に失敗しました' },
      { status: 500 }
    );
  }
}

// 計画一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let q = query(
      collection(db, 'plans'),
      orderBy('createdAt', 'desc')
    );

    if (userId) {
      q = query(q, where('userId', '==', userId));
    }

    const snapshot = await getDocs(q);
    const plans = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      plans,
      total: snapshot.size
    });

  } catch (error) {
    console.error('計画取得エラー:', error);
    return NextResponse.json(
      { error: '計画の取得に失敗しました' },
      { status: 500 }
    );
  }
}
