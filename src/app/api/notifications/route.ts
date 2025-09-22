import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc } from 'firebase/firestore';

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

// モックデータ（実際の実装ではFirestoreから取得）
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: '新機能リリースのお知らせ',
    message: 'AIチャット機能とAI学習進捗ページがリリースされました。より詳細な分析とパーソナライズされたAIアシスタントをご利用いただけます。',
    type: 'success',
    priority: 'high',
    targetUsers: [],
    status: 'published',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    createdBy: 'system'
  },
  {
    id: '2',
    title: 'メンテナンス予告',
    message: '2024年1月25日 2:00-4:00（JST）にシステムメンテナンスを実施いたします。この時間帯は一部機能がご利用いただけません。',
    type: 'warning',
    priority: 'medium',
    targetUsers: [],
    status: 'published',
    scheduledAt: '2024-01-25T02:00:00Z',
    expiresAt: '2024-01-25T04:00:00Z',
    createdAt: '2024-01-19T15:30:00Z',
    updatedAt: '2024-01-19T15:30:00Z',
    createdBy: 'admin'
  },
  {
    id: '3',
    title: '月次レポート機能の改善',
    message: '月次レポートページに新しい分析機能が追加されました。AI予測機能、トレンド分析、データエクスポート機能をご利用いただけます。',
    type: 'info',
    priority: 'medium',
    targetUsers: [],
    status: 'published',
    createdAt: '2024-01-18T14:20:00Z',
    updatedAt: '2024-01-18T14:20:00Z',
    createdBy: 'dev-team'
  },
  {
    id: '4',
    title: 'データエクスポート機能について',
    message: 'CSV/PDFエクスポート機能をご利用いただくには、最低15個の投稿データが必要です。データ不足の場合は、投稿ラボでコンテンツを作成してください。',
    type: 'info',
    priority: 'low',
    targetUsers: [],
    status: 'published',
    createdAt: '2024-01-17T11:45:00Z',
    updatedAt: '2024-01-17T11:45:00Z',
    createdBy: 'support'
  },
  {
    id: '5',
    title: 'AI学習機能の活用方法',
    message: 'AIチャットを積極的にご利用いただくことで、よりパーソナライズされたAIアシスタントに成長します。質問や相談をどんどんお寄せください。',
    type: 'info',
    priority: 'low',
    targetUsers: [],
    status: 'published',
    createdAt: '2024-01-16T09:15:00Z',
    updatedAt: '2024-01-16T09:15:00Z',
    createdBy: 'ai-team'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'current-user';
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';

    // Firestoreから取得
    const notificationsRef = collection(db, 'notifications');
    let q = query(
      notificationsRef,
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );

    // ユーザー指定の場合は、対象ユーザーもフィルタ
    if (userId !== 'current-user') {
      q = query(
        notificationsRef,
        where('status', '==', 'published'),
        where('targetUsers', 'array-contains', userId),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    let firestoreNotifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));

    // Firestoreにデータがない場合はモックデータを使用
    if (firestoreNotifications.length === 0) {
      firestoreNotifications = [...mockNotifications];
    }

    let filteredNotifications = [...firestoreNotifications];

    // フィルタリング
    if (filter === 'unread') {
      // 実際の実装では、ユーザーごとの既読状態をチェック
      // filteredNotifications = filteredNotifications.filter(n => !isReadByUser(n.id, userId));
    } else if (filter === 'starred') {
      // 実際の実装では、ユーザーごとのお気に入り状態をチェック
      // filteredNotifications = filteredNotifications.filter(n => isStarredByUser(n.id, userId));
    } else if (filter === 'archived') {
      filteredNotifications = filteredNotifications.filter(n => n.status === 'archived');
    } else {
      filteredNotifications = filteredNotifications.filter(n => n.status === 'published');
    }

    // 検索フィルタ
    if (search.trim()) {
      const query = search.toLowerCase();
      filteredNotifications = filteredNotifications.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    // 期限切れチェック
    const now = new Date();
    filteredNotifications = filteredNotifications.filter(n => {
      if (n.expiresAt) {
        return new Date(n.expiresAt) > now;
      }
      return true;
    });

    // 予約配信チェック
    filteredNotifications = filteredNotifications.filter(n => {
      if (n.scheduledAt) {
        return new Date(n.scheduledAt) <= now;
      }
      return true;
    });

    // 作成日時でソート（新しい順）
    filteredNotifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: filteredNotifications,
      total: filteredNotifications.length,
      userId,
      filter,
      search
    });

  } catch (error) {
    console.error('通知取得エラー:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, type, priority, targetUsers, scheduledAt, expiresAt } = body;

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
    const newNotification: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      priority,
      targetUsers: targetUsers || [],
      status: 'published',
      scheduledAt,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current-user' // 実際の実装では認証されたユーザーID
    };

    // Firestoreに保存
    const notificationsRef = collection(db, 'notifications');
    const docRef = await addDoc(notificationsRef, newNotification);
    
    // 作成されたドキュメントのIDを設定
    newNotification.id = docRef.id;

    return NextResponse.json({
      success: true,
      data: newNotification,
      message: '通知が作成されました'
    });

  } catch (error) {
    console.error('通知作成エラー:', error);
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
