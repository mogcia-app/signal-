import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/firebase';
import { doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface BulkActionRequest {
  action: 'publish' | 'archive' | 'delete' | 'updateStatus';
  notificationIds: string[];
  status?: 'draft' | 'published' | 'archived';
}

// 管理者用の一括操作
export async function POST(request: NextRequest) {
  try {
    const body: BulkActionRequest = await request.json();
    const { action, notificationIds, status } = body;

    if (!action || !notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '無効なリクエストです' 
        },
        { status: 400 }
      );
    }

    if (notificationIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '通知IDが指定されていません' 
        },
        { status: 400 }
      );
    }

    const batch = writeBatch(db);
    const results = [];

    for (const notificationId of notificationIds) {
      const docRef = doc(db, 'notifications', notificationId);

      switch (action) {
        case 'publish':
          batch.update(docRef, {
            status: 'published',
            updatedAt: new Date().toISOString()
          });
          results.push({ id: notificationId, action: 'published' });
          break;

        case 'archive':
          batch.update(docRef, {
            status: 'archived',
            updatedAt: new Date().toISOString()
          });
          results.push({ id: notificationId, action: 'archived' });
          break;

        case 'delete':
          batch.delete(docRef);
          results.push({ id: notificationId, action: 'deleted' });
          break;

        case 'updateStatus':
          if (!status) {
            return NextResponse.json(
              { 
                success: false, 
                error: 'ステータスが指定されていません' 
              },
              { status: 400 }
            );
          }
          batch.update(docRef, {
            status,
            updatedAt: new Date().toISOString()
          });
          results.push({ id: notificationId, action: 'status_updated', status });
          break;

        default:
          return NextResponse.json(
            { 
              success: false, 
              error: '無効なアクションです' 
            },
            { status: 400 }
          );
      }
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      data: results,
      message: `${notificationIds.length}件の通知に対して${action}操作を実行しました`
    });

  } catch (error) {
    console.error('一括操作エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '一括操作に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
