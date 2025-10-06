import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// 特定の投稿取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const postId = resolvedParams.id;
    const docRef = doc(db, 'posts', postId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    const postData = {
      id: docSnap.id,
      ...docSnap.data()
    };

    return NextResponse.json({ post: postData });

  } catch (error) {
    console.error('投稿取得エラー:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 投稿更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const postId = resolvedParams.id;
    const body = await request.json();
    const { title, content, hashtags, postType, scheduledDate, scheduledTime, status, imageUrl, imageData, analytics } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    // 更新するフィールドのみ追加
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (hashtags !== undefined) updateData.hashtags = hashtags;
    if (postType !== undefined) updateData.postType = postType;
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) updateData.scheduledTime = scheduledTime;
    if (status !== undefined) updateData.status = status;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (imageData !== undefined) updateData.imageData = imageData;
    if (analytics !== undefined) updateData.analytics = analytics;

    const docRef = doc(db, 'posts', postId);
    await updateDoc(docRef, updateData);

    // デバッグ用ログ
    console.log('Post updated with analytics:', {
      id: postId,
      analytics: updateData.analytics
    });

    return NextResponse.json({
      message: '投稿が更新されました',
      id: postId
    });

  } catch (error) {
    console.error('投稿更新エラー:', error);
    return NextResponse.json(
      { error: '投稿の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// 投稿削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const postId = resolvedParams.id;
    const docRef = doc(db, 'posts', postId);
    await deleteDoc(docRef);

    return NextResponse.json({
      message: '投稿が削除されました',
      id: postId
    });

  } catch (error) {
    console.error('投稿削除エラー:', error);
    return NextResponse.json(
      { error: '投稿の削除に失敗しました' },
      { status: 500 }
    );
  }
}
