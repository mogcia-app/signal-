import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

interface AIOutputLog {
  id: string;
  userId: string;
  pageType: string;
  outputType: 'recommendation' | 'analysis' | 'insight' | 'strategy';
  title: string;
  content: string;
  timestamp: Date;
  contextData?: Record<string, unknown>;
}

// AI出力ログを取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const pageType = searchParams.get('pageType');
    const outputType = searchParams.get('outputType');
    const limitCount = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // クエリを構築
    let logsQuery = query(
      collection(db, 'aiOutputLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    // ページタイプでフィルタリング
    if (pageType) {
      logsQuery = query(
        collection(db, 'aiOutputLogs'),
        where('userId', '==', userId),
        where('pageType', '==', pageType),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }

    const logsSnapshot = await getDocs(logsQuery);
    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as AIOutputLog[];

    // 出力タイプでフィルタリング（クライアント側）
    const filteredLogs = outputType 
      ? logs.filter(log => log.outputType === outputType)
      : logs;

    return NextResponse.json({
      success: true,
      logs: filteredLogs
    });

  } catch (error) {
    console.error('AI Output Logs API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI output logs', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// AI出力ログを保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      pageType, 
      outputType, 
      title, 
      content, 
      contextData 
    } = body;

    if (!userId || !pageType || !outputType || !title || !content) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, pageType, outputType, title, content' 
      }, { status: 400 });
    }

    // 出力タイプの検証
    const validOutputTypes = ['recommendation', 'analysis', 'insight', 'strategy'];
    if (!validOutputTypes.includes(outputType)) {
      return NextResponse.json({ 
        error: 'Invalid outputType. Must be one of: recommendation, analysis, insight, strategy' 
      }, { status: 400 });
    }

    // AI出力ログを保存
    const logData = {
      userId,
      pageType,
      outputType,
      title,
      content,
      timestamp: new Date(),
      contextData: contextData || null
    };

    const docRef = await addDoc(collection(db, 'aiOutputLogs'), logData);

    return NextResponse.json({
      success: true,
      logId: docRef.id,
      data: {
        id: docRef.id,
        ...logData
      }
    });

  } catch (error) {
    console.error('AI Output Logs Save Error:', error);
    return NextResponse.json(
      { error: 'Failed to save AI output log', details: (error as Error).message },
      { status: 500 }
    );
  }
}
