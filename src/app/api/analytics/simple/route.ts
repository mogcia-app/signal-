import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase-admin';

// GET: 分析データを取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = getAdminDb();
    
    // 分析データを取得
    const analyticsRef = db.collection('analytics');
    const querySnapshot = await analyticsRef
      .where('userId', '==', userId)
      .orderBy('publishedAt', 'desc')
      .get();

    const analyticsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      publishedAt: doc.data().publishedAt?.toDate?.()?.toISOString() || doc.data().publishedAt,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
    }));

    return NextResponse.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// POST: 分析データを保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      postId,
      likes,
      comments,
      shares,
      reposts,
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
      // フィード専用フィールド
      reachFollowerPercent,
      interactionCount,
      interactionFollowerPercent,
      reachSourceProfile,
      reachSourceFeed,
      reachSourceExplore,
      reachSourceSearch,
      reachSourceOther,
      reachedAccounts,
      profileVisits,
      profileFollows,
      // リール専用フィールド
      reelReachFollowerPercent,
      reelInteractionCount,
      reelInteractionFollowerPercent,
      reelReachSourceProfile,
      reelReachSourceReel,
      reelReachSourceExplore,
      reelReachSourceSearch,
      reelReachSourceOther,
      reelReachedAccounts,
      reelSkipRate,
      reelNormalSkipRate,
      reelPlayTime,
      reelAvgPlayTime,
      audience,
      reachSource,
      sentiment,
      sentimentMemo
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = getAdminDb();
    
    // 分析データを保存
    const analyticsData = {
      userId,
      postId: postId || null,
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      shares: parseInt(shares) || 0,
      reposts: parseInt(reposts) || 0,
      reach: parseInt(reach) || 0,
      saves: parseInt(saves) || 0,
      followerIncrease: parseInt(followerIncrease) || 0,
      engagementRate: 0,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      publishedTime: publishedTime || '',
      title: title || '',
      content: content || '',
      hashtags: hashtags || [],
      thumbnail: thumbnail || '',
      category: category || 'feed',
      // フィード専用フィールド
      reachFollowerPercent: parseFloat(reachFollowerPercent) || 0,
      interactionCount: parseInt(interactionCount) || 0,
      interactionFollowerPercent: parseFloat(interactionFollowerPercent) || 0,
      reachSourceProfile: parseInt(reachSourceProfile) || 0,
      reachSourceFeed: parseInt(reachSourceFeed) || 0,
      reachSourceExplore: parseInt(reachSourceExplore) || 0,
      reachSourceSearch: parseInt(reachSourceSearch) || 0,
      reachSourceOther: parseInt(reachSourceOther) || 0,
      reachedAccounts: parseInt(reachedAccounts) || 0,
      profileVisits: parseInt(profileVisits) || 0,
      profileFollows: parseInt(profileFollows) || 0,
      // リール専用フィールド
      reelReachFollowerPercent: parseFloat(reelReachFollowerPercent) || 0,
      reelInteractionCount: parseInt(reelInteractionCount) || 0,
      reelInteractionFollowerPercent: parseFloat(reelInteractionFollowerPercent) || 0,
      reelReachSourceProfile: parseInt(reelReachSourceProfile) || 0,
      reelReachSourceReel: parseInt(reelReachSourceReel) || 0,
      reelReachSourceExplore: parseInt(reelReachSourceExplore) || 0,
      reelReachSourceSearch: parseInt(reelReachSourceSearch) || 0,
      reelReachSourceOther: parseInt(reelReachSourceOther) || 0,
      reelReachedAccounts: parseInt(reelReachedAccounts) || 0,
      reelSkipRate: parseFloat(reelSkipRate) || 0,
      reelNormalSkipRate: parseFloat(reelNormalSkipRate) || 0,
      reelPlayTime: parseInt(reelPlayTime) || 0,
      reelAvgPlayTime: parseFloat(reelAvgPlayTime) || 0,
      audience: audience || null,
      reachSource: reachSource || null,
      sentiment: sentiment || null,
      sentimentMemo: sentimentMemo || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('analytics').add(analyticsData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Analytics data saved successfully'
    });

  } catch (error) {
    console.error('Analytics save error:', error);
    return NextResponse.json(
      { error: 'Failed to save analytics data' },
      { status: 500 }
    );
  }
}

