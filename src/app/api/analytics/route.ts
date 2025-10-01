import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

// エンゲージメント率計算のビジネスロジック（サーバー側で保護）
function calculateEngagementRate(likes: number, comments: number, shares: number, saves: number, reach: number): number {
  const likesNum = Number(likes) || 0;
  const commentsNum = Number(comments) || 0;
  const sharesNum = Number(shares) || 0;
  const savesNum = Number(saves) || 0;
  const reachNum = Number(reach) || 0;
  
  // リーチ数が0の場合は計算しない
  if (reachNum <= 0) {
    return 0;
  }
  
  // エンゲージメント率計算（リーチ数ベース）
  const totalEngagement = likesNum + commentsNum + sharesNum + savesNum;
  const engagementRate = (totalEngagement / reachNum) * 100;
    
  return Math.round(engagementRate * 100) / 100; // 小数点2桁で四捨五入
}

// 投稿分析データを保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      postId,
      likes, 
      comments, 
      shares, 
      reach, 
      saves, 
      followerIncrease,
      publishedAt,
      publishedTime,
      title,
      content,
      hashtags,
      thumbnail,
      category,
      audience,
      reachSource
    } = body;

    // ミドルウェアから認証されたユーザーIDを取得
    const authenticatedUserId = request.headers.get('x-user-id');
    
    if (!authenticatedUserId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // リクエストのuserIdと認証されたuserIdが一致することを確認
    if (userId !== authenticatedUserId) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 });
    }
    
    if (likes === undefined || likes === null) {
      return NextResponse.json({ error: 'いいね数が必要です' }, { status: 400 });
    }
    
    if (reach === undefined || reach === null) {
      return NextResponse.json({ error: 'リーチ数が必要です' }, { status: 400 });
    }

    // 数値変換とバリデーション
    const likesNum = parseInt(likes) || 0;
    const commentsNum = parseInt(comments) || 0;
    const sharesNum = parseInt(shares) || 0;
    const reachNum = parseInt(reach) || 0;
    const savesNum = parseInt(saves) || 0;
    const followerIncreaseNum = parseInt(followerIncrease) || 0;

    // サーバー側でエンゲージメント率を計算（ロジック保護）
    const engagementRate = calculateEngagementRate(likesNum, commentsNum, sharesNum, savesNum, reachNum);

    // 日時処理
    const publishedDateTime = new Date(`${publishedAt}T${publishedTime}:00`);
    
    // ハッシュタグ処理
    const hashtagsArray = hashtags ? hashtags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : [];

    const analyticsPayload = {
      userId,
      postId: postId || null, // 投稿とのリンク（手動入力の場合はnull）
      likes: likesNum,
      comments: commentsNum,
      shares: sharesNum,
      reach: reachNum,
      saves: savesNum,
      followerIncrease: followerIncreaseNum,
      engagementRate, // サーバー側で計算済み
      publishedAt: publishedDateTime,
      createdAt: new Date(),
      title: title || '',
      content: content || '',
      hashtags: hashtagsArray,
      thumbnail: thumbnail || '',
      category: category || 'feed',
      audience: audience || null, // オーディエンス分析データ
      reachSource: reachSource || null // 閲覧数ソース分析データ
    };

    console.log('Saving analytics data via BFF:', {
      userId: analyticsPayload.userId,
      engagementRate: analyticsPayload.engagementRate,
      // その他の詳細はログに出力しない（セキュリティ）
    });

    const docRef = await addDoc(collection(db, 'analytics'), analyticsPayload);

    return NextResponse.json({ 
      id: docRef.id, 
      message: '投稿分析データを保存しました',
      engagementRate // 計算結果のみ返却
    });

  } catch (error) {
    console.error('Analytics POST error:', error);
    return NextResponse.json({ 
      error: '保存に失敗しました', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 投稿分析データを取得
export async function GET(request: NextRequest) {
  try {
    // ミドルウェアから認証されたユーザーIDを取得
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const q = query(
      collection(db, 'analytics'),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        // 数値フィールドを明示的に数値型に変換
        likes: Number(docData.likes) || 0,
        comments: Number(docData.comments) || 0,
        shares: Number(docData.shares) || 0,
        reach: Number(docData.reach) || 0,
        saves: Number(docData.saves) || 0,
        followerIncrease: Number(docData.followerIncrease) || 0,
        engagementRate: Number(docData.engagementRate) || 0,
        // 日時の適切な処理
        publishedAt: docData.publishedAt?.toDate ? docData.publishedAt.toDate() : new Date(docData.publishedAt),
        createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : new Date(docData.createdAt)
      };
    });

    // クライアント側でソート（サーバー側では複合インデックス不要）
    data.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({ 
      analytics: data, 
      total: data.length 
    });

  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({ 
      error: 'データの取得に失敗しました', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
