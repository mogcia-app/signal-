import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';

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

    console.log('X投稿取得API - userId:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'userIdが必要です' },
        { status: 400 }
      );
    }

    // Firestoreから投稿を取得（orderByを一時的に削除してテスト）
    const postsQuery = query(
      collection(db, 'xposts'),
      where('userId', '==', userId)
    );
    
    console.log('Firestoreクエリ実行中...');
    const querySnapshot = await getDocs(postsQuery);
    console.log('クエリ結果:', querySnapshot.docs.length, '件の投稿を取得');
    
    const posts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
      updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt) : new Date()
    }));

    console.log('投稿データ処理完了:', posts.length, '件');

    return NextResponse.json({
      success: true,
      posts: posts,
      message: '投稿一覧を取得しました'
    });

  } catch (error) {
    console.error('X投稿取得エラー詳細:', error);
    console.error('エラースタック:', error.stack);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
