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
  imageUrl?: string | null; // 画像URL
  imageData?: string | null; // Base64画像データ（一時保存用）
  analytics?: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    engagementRate: number;
    publishedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 投稿作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, content, hashtags, postType, scheduledDate, scheduledTime, status = 'draft', imageUrl, imageData, analytics } = body;

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
      imageUrl: imageUrl || null,
      imageData: imageData || null,
      analytics: analytics || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'posts'), postData);
    
    // デバッグ用ログ
    console.log('Post created with analytics:', {
      id: docRef.id,
      analytics: postData.analytics
    });
    
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

    // 本番環境でFirebase設定がない場合は空の配列を返す
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      console.log('Firebase API key not found in production, returning empty posts');
      return NextResponse.json({
        posts: [],
        total: 0
      });
    }

    console.log('Firebase API key found, proceeding with database query');
    console.log('Query parameters:', { userId, status, postType, limit });

    let q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc')
    );

    // フィルタリング
    if (userId) {
      console.log('Filtering posts by userId:', userId);
      q = query(q, where('userId', '==', userId));
    }
    if (status) {
      console.log('Filtering posts by status:', status);
      q = query(q, where('status', '==', status));
    }
    if (postType) {
      console.log('Filtering posts by postType:', postType);
      q = query(q, where('postType', '==', postType));
    }

    const snapshot = await getDocs(q);
    const posts = snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Fetched posts from collection:', posts.length, 'records');
    console.log('Posts query result sample:', posts.slice(0, 2));

    return NextResponse.json({
      posts,
      total: snapshot.size
    });

  } catch (error) {
    console.error('投稿取得エラー:', error);
    // エラーが発生した場合は空の配列を返す
    return NextResponse.json({
      posts: [],
      total: 0
    });
  }
}
