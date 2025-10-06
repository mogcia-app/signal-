import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, hashtags, postType, isAIGenerated, userId, createdAt } = body;

    // バリデーション
    if (!title || !content || !userId) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // Firestoreに保存
    const postData = {
      title,
      content,
      hashtags: hashtags || [],
      postType: postType || 'tweet',
      isAIGenerated: isAIGenerated || false,
      userId,
      createdAt: createdAt || new Date().toISOString(),
      platform: 'x'
    };

    const docRef = await addDoc(collection(db, 'xposts'), postData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: '投稿を保存しました'
    });

  } catch (error) {
    console.error('X投稿保存エラー:', error);
    return NextResponse.json(
      { error: '投稿の保存に失敗しました' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userIdが必要です' },
        { status: 400 }
      );
    }

    // ここでFirestoreから投稿を取得する処理を実装
    // 現在は基本的なレスポンスを返す
    return NextResponse.json({
      success: true,
      posts: [],
      message: '投稿一覧を取得しました'
    });

  } catch (error) {
    console.error('X投稿取得エラー:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}
