import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

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

// 初期通知データ（Firestoreに保存する用）
const initialNotifications: Omit<Notification, 'id'>[] = [
  {
    title: '新機能リリースのお知らせ',
    message: 'AIチャット機能とAI学習進捗ページがリリースされました。より詳細な分析とパーソナライズされたAIアシスタントをご利用いただけます。',
    type: 'success',
    priority: 'high',
    targetUsers: [],
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system'
  },
  {
    title: '月次レポート機能の改善',
    message: '月次レポートページに新しい分析機能が追加されました。AI予測機能、トレンド分析、データエクスポート機能をご利用いただけます。',
    type: 'info',
    priority: 'medium',
    targetUsers: [],
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system'
  },
  {
    title: 'AI学習機能の活用方法',
    message: 'AIチャットを積極的にご利用いただくことで、よりパーソナライズされたAIアシスタントに成長します。質問や相談をどんどんお寄せください。',
    type: 'info',
    priority: 'low',
    targetUsers: [],
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system'
  }
];

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 通知API呼び出し開始');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'current-user';
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';

    console.log('📊 リクエストパラメータ:', { userId, filter, search });

    // Firestoreから取得
    const notificationsRef = collection(db, 'notifications');
    
    console.log('🔍 Firestoreクエリを実行中...');
    let snapshot;
    try {
      // シンプルなクエリを使用（インデックス不要）
      // orderByとwhereの複合クエリはインデックスが必要なため、まずは基本的なクエリのみ
      const q = query(
        notificationsRef,
        where('status', '==', 'published')
        // orderBy('createdAt', 'desc') // 一時的にコメントアウト - クライアント側でソート
      );
      
      snapshot = await getDocs(q);
      console.log('✅ Firestoreクエリ成功:', { docCount: snapshot.docs.length });
    } catch (firestoreError) {
      console.error('❌ Firestoreクエリエラー:', firestoreError);
      
      // フォールバック: statusフィルタなしで全件取得
      try {
        console.log('🔄 フォールバック: 全件取得を試行');
        const fallbackQuery = query(notificationsRef);
        snapshot = await getDocs(fallbackQuery);
        console.log('✅ フォールバッククエリ成功:', { docCount: snapshot.docs.length });
      } catch (fallbackError) {
        console.error('❌ フォールバッククエリもエラー:', fallbackError);
        throw new Error(`Firestoreクエリエラー: ${firestoreError instanceof Error ? firestoreError.message : 'Unknown error'}`);
      }
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

    // Firestoreにデータがない場合は初期データを作成
    if (firestoreNotifications.length === 0) {
      console.log('📝 Firestoreに通知データがないため、初期データを作成します');
      try {
        // 初期通知データをFirestoreに保存
        for (const notificationData of initialNotifications) {
          await addDoc(collection(db, 'notifications'), notificationData);
        }
        console.log('✅ 初期通知データの作成が完了しました');
        
        // 作成したデータを再取得
        const refreshQuery = query(notificationsRef, where('status', '==', 'published'));
        const newSnapshot = await getDocs(refreshQuery);
        firestoreNotifications = newSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notification));
      } catch (initError) {
        console.error('❌ 初期データ作成エラー:', initError);
        // エラーの場合は空配列を返す
        firestoreNotifications = [];
      }
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
