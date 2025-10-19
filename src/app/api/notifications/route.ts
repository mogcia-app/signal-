import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';

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

// ダミーデータを完全に削除

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 通知API呼び出し開始');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'current-user';
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';

    console.log('📊 リクエストパラメータ:', { userId, filter, search });

    // Firestoreから取得（Admin SDK使用）
    console.log('🔍 Firestoreクエリを実行中...');
    let snapshot;
    try {
      snapshot = await adminDb
        .collection('notifications')
        .where('status', '==', 'published')
        .get();
      
      console.log('✅ Firestoreクエリ成功:', { docCount: snapshot.docs.length });
    } catch (firestoreError) {
      console.error('❌ Firestoreクエリエラー:', firestoreError);
      throw new Error(`Firestoreクエリエラー: ${firestoreError instanceof Error ? firestoreError.message : 'Unknown error'}`);
    }
    
    let firestoreNotifications: Notification[] = [];
    try {
      firestoreNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      console.log('✅ データ変換成功:', { notificationCount: firestoreNotifications.length });
    } catch (mappingError) {
      console.error('❌ データ変換エラー:', mappingError);
      throw new Error(`データ変換エラー: ${mappingError instanceof Error ? mappingError.message : 'Unknown error'}`);
    }

    // 管理者側から通知が作成されるまで空の配列を返す
    if (firestoreNotifications.length === 0) {
      console.log('📝 Firestoreに通知データがありません。管理者側から通知を作成してください。');
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }

    let filteredNotifications = [...firestoreNotifications];

    // targetUsersフィルタリング（Admin Panel連携仕様）
    // targetUsersが空配列 = 全ユーザー向け
    // targetUsersにuidが含まれる = 特定ユーザー向け
    if (userId !== 'current-user') {
      filteredNotifications = filteredNotifications.filter(n => 
        !n.targetUsers || 
        n.targetUsers.length === 0 || 
        n.targetUsers.includes(userId)
      );
      console.log('🎯 targetUsersフィルタリング適用:', {
        userId,
        before: firestoreNotifications.length,
        after: filteredNotifications.length
      });
    }

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
    console.error('❌ 通知取得エラー:', error);
    console.error('❌ エラーの詳細:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: '通知の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
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
    const docRef = await adminDb.collection('notifications').add(newNotification);
    
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