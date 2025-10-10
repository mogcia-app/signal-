import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// フィードバックデータのインターフェース
interface FeedbackData {
  id?: string;
  userId: string;
  pageType: 'analytics' | 'monthly-report' | 'plan' | 'posts';
  satisfaction: 'satisfied' | 'dissatisfied';
  feedback: string;
  contextData: Record<string, unknown>;
  timestamp: Date;
  processed: boolean;
}

// フィードバックを保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pageType, satisfaction, feedback, contextData } = body;

    if (!userId || !pageType || !satisfaction || !feedback) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId, pageType, satisfaction, and feedback are required' 
      }, { status: 400 });
    }

    const feedbackData: FeedbackData = {
      userId,
      pageType,
      satisfaction,
      feedback,
      contextData: contextData || {},
      timestamp: new Date(),
      processed: false
    };

    const docRef = await addDoc(collection(db, 'user_feedback'), feedbackData);

    return NextResponse.json({ 
      success: true, 
      message: 'フィードバックが保存されました',
      id: docRef.id
    });

  } catch (error) {
    console.error('フィードバック保存エラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// フィードバックを取得（学習用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const pageType = searchParams.get('pageType');

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId is required' 
      }, { status: 400 });
    }

    let q = query(
      collection(db, 'user_feedback'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    if (pageType) {
      q = query(
        collection(db, 'user_feedback'),
        where('userId', '==', userId),
        where('pageType', '==', pageType),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    }

    const snapshot = await getDocs(q);
    const feedbacks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ 
      success: true, 
      data: feedbacks
    });

  } catch (error) {
    console.error('フィードバック取得エラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



