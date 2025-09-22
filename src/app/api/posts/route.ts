import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

// 投稿データの型定義
interface PostData {
  id?: string;
  userId: string;
  title: string;
  content: string;
  hashtags: string[];
  postType: 'feed' | 'reel' | 'story';
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'draft' | 'scheduled' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

// 投稿作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, content, hashtags, postType, scheduledDate, scheduledTime, status = 'draft' } = body;

    // バリデーション
    if (!userId || !title || !content) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    const postData: Omit<PostData, 'id'> = {
      userId,
      title,
      content,
      hashtags: hashtags || [],
      postType: postType || 'feed',
      scheduledDate: scheduledDate || null,
      scheduledTime: scheduledTime || null,
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'posts'), postData);
    
    return NextResponse.json({
      id: docRef.id,
      message: '投稿が保存されました',
      data: { ...postData, id: docRef.id }
    });

  } catch (error) {
    console.error('投稿作成エラー:', error);
    return NextResponse.json(
      { error: '投稿の保存に失敗しました' },
      { status: 500 }
    );
  }
}

// 投稿一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const postType = searchParams.get('postType');
    const limit = parseInt(searchParams.get('limit') || '50');

    let q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc')
    );

    // フィルタリング
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    if (status) {
      q = query(q, where('status', '==', status));
    }
    if (postType) {
      q = query(q, where('postType', '==', postType));
    }

    const snapshot = await getDocs(q);
    const posts = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      posts,
      total: snapshot.size
    });

  } catch (error) {
    console.error('投稿取得エラー:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}
