import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

// エンゲージメント率計算のビジネスロジック（サーバー側で保護）
function calculateEngagementRate(likes: number, comments: number, shares: number, saves: number, reach: number): number {
  // リーチ数が0または未入力の場合は推定値を使用
  const estimatedReach = reach > 0 ? reach : (likes + comments + shares + saves) * 10;
  
  // エンゲージメント率計算
  const engagementRate = estimatedReach > 0 
    ? (likes + comments + shares + saves) / estimatedReach * 100 
    : 0;
    
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
      category
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
      postId: postId || '', // 投稿とのリンク
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
      category: category || 'feed'
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
