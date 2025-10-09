import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';

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
  
  // シミュレーション結果（オプショナル）
  simulationResult?: {
    estimatedFollowers: number;
    estimatedLikes: number;
    estimatedComments: number;
    estimatedShares: number;
    estimatedReach: number;
    successProbability: number;
    improvementTips: string[];
    weeklyBreakdown: {
      week: number;
      followers: number;
      likes: number;
      comments: number;
      shares: number;
      reach: number;
    }[];
    monthlyBreakdown: {
      month: number;
      followers: number;
      likes: number;
      comments: number;
      shares: number;
      reach: number;
    }[];
    riskFactors: string[];
    recommendedActions: string[];
  } | null;
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

    const docRef = await adminDb.collection('plans').add(planData);
    
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

    // userIdが指定されていない場合はエラー
    if (!userId) {
      return NextResponse.json(
        { error: 'userIdが必要です' },
        { status: 400 }
      );
    }

    const snapshot = await adminDb
      .collection('plans')
      .where('userId', '==', userId)
      .get();
    
    const plans = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt || Date.now())
        };
      })
      .sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime; // 降順（新しい順）
      })
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: plans,
      total: snapshot.size
    });

  } catch (error) {
    const { searchParams } = new URL(request.url);
    console.error('計画取得エラー:', error);
    console.error('エラーの詳細:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: searchParams.get('userId')
    });
    return NextResponse.json(
      { 
        success: false,
        error: '計画の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
