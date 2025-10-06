import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: '投稿IDが必要です' },
        { status: 400 }
      );
    }

    // Firestoreから投稿を削除
    await deleteDoc(doc(db, 'xposts', postId));

    return NextResponse.json({
      success: true,
      message: '投稿を削除しました'
    });

  } catch (error) {
    console.error('X投稿削除エラー:', error);
    return NextResponse.json(
      { error: '投稿の削除に失敗しました' },
      { status: 500 }
    );
  }
}
