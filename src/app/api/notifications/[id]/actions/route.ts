import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '../../../../../lib/firebase-admin';

interface UserNotificationAction {
  id: string;
  userId: string;
  notificationId: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// モックデータ（実際の実装ではFirestoreのuserNotificationsコレクションを使用）
// const mockUserNotifications: UserNotificationAction[] = [];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;
    const body = await request.json();
    const { action, userId = 'current-user' } = body;

    if (!action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'アクションが指定されていません' 
        },
        { status: 400 }
      );
    }

    const validActions = ['read', 'star', 'archive'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '無効なアクションです' 
        },
        { status: 400 }
      );
    }

    // FirestoreのuserNotificationsコレクションを使用（Admin SDK）
    const db = getAdminDb();
    const userNotificationRef = db.collection('userNotifications').doc(`${userId}_${notificationId}`);
    const userNotificationSnap = await userNotificationRef.get();

    let userNotification: UserNotificationAction;

    if (userNotificationSnap.exists) {
      userNotification = userNotificationSnap.data() as UserNotificationAction;
    } else {
      // 新しいユーザー通知レコードを作成
      userNotification = {
        id: `${userId}_${notificationId}`,
        userId,
        notificationId,
        read: false,
        starred: false,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // アクションに応じて状態を更新
    switch (action) {
      case 'read':
        userNotification.read = true;
        break;
      case 'star':
        userNotification.starred = !userNotification.starred;
        break;
      case 'archive':
        userNotification.archived = true;
        break;
    }

    userNotification.updatedAt = new Date().toISOString();

    // Firestoreに保存（Admin SDK）
    await userNotificationRef.set(userNotification, { merge: true });

    return NextResponse.json({
      success: true,
      data: userNotification,
      message: getActionMessage(action, userNotification)
    });

  } catch (error) {
    console.error('通知アクションエラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '通知アクションの実行に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;
    const userId = request.nextUrl.searchParams.get('userId') || 'current-user';

    // Firestoreから取得（Admin SDK）
    const db = getAdminDb();
    const userNotificationRef = db.collection('userNotifications').doc(`${userId}_${notificationId}`);
    const userNotificationSnap = await userNotificationRef.get();

    if (!userNotificationSnap.exists) {
      // デフォルトの状態を返す
      return NextResponse.json({
        success: true,
        data: {
          id: `${userId}_${notificationId}`,
          userId,
          notificationId,
          read: false,
          starred: false,
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }

    const userNotification = userNotificationSnap.data() as UserNotificationAction;

    return NextResponse.json({
      success: true,
      data: userNotification
    });

  } catch (error) {
    console.error('通知アクション取得エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '通知アクションの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getActionMessage(action: string, userNotification: UserNotificationAction): string {
  switch (action) {
    case 'read':
      return '通知を既読にしました';
    case 'star':
      return userNotification.starred ? 'お気に入りに追加しました' : 'お気に入りを解除しました';
    case 'archive':
      return '通知をアーカイブしました';
    default:
      return '通知の状態を更新しました';
  }
}
