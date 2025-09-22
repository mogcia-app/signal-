import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, where } from 'firebase/firestore';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high';
  targetUsers: string[];
  status: 'draft' | 'published' | 'archived';
  scheduledAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// 管理者用の通知一覧取得（全ステータス）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const notificationsRef = collection(db, 'notifications');
    let q = query(notificationsRef, orderBy('createdAt', 'desc'));

    // ステータスフィルタ
    if (status !== 'all') {
      q = query(notificationsRef, where('status', '==', status), orderBy('createdAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    const allNotifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));

    // ページネーション
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = allNotifications.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedNotifications,
      pagination: {
        page,
        limit,
        total: allNotifications.length,
        totalPages: Math.ceil(allNotifications.length / limit)
      }
    });

  } catch (error) {
    console.error('管理者通知取得エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '通知の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 管理者用の通知作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      message, 
      type, 
      priority, 
      targetUsers, 
      status = 'draft',
      scheduledAt, 
      expiresAt 
    } = body;

    // バリデーション
    if (!title || !message || !type || !priority) {
      return NextResponse.json(
        { 
          success: false, 
          error: '必須フィールドが不足しています' 
        },
        { status: 400 }
      );
    }

    // 新しい通知の作成
    const newNotification: Omit<Notification, 'id'> = {
      title,
      message,
      type,
      priority,
      targetUsers: targetUsers || [],
      status,
      scheduledAt,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin' // 実際の実装では認証された管理者のID
    };

    // Firestoreに保存
    const notificationsRef = collection(db, 'notifications');
    const docRef = await addDoc(notificationsRef, newNotification);

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        ...newNotification
      },
      message: '通知が作成されました'
    });

  } catch (error) {
    console.error('管理者通知作成エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '通知の作成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
