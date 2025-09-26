import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

// 簡単なファイルベースデータベース
const DATA_DIR = join(process.cwd(), 'data');
const ANALYTICS_FILE = join(DATA_DIR, 'analytics.json');

// データディレクトリとファイルの初期化
async function ensureDataFile() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const fileExists = await readFile(ANALYTICS_FILE, 'utf8').catch(() => null);
    if (!fileExists) {
      await writeFile(ANALYTICS_FILE, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error initializing data file:', error);
  }
}

// データを読み込み
async function readAnalyticsData() {
  try {
    await ensureDataFile();
    const data = await readFile(ANALYTICS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading analytics data:', error);
    return [];
  }
}

// データを保存
async function writeAnalyticsData(data: Record<string, unknown>[]) {
  try {
    await ensureDataFile();
    await writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing analytics data:', error);
  }
}

// 分析データ作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      postId, 
      userId, 
      likes, 
      comments, 
      shares, 
      reach, 
      engagementRate,
      profileClicks,
      websiteClicks,
      storyViews,
      followerChange,
      publishedAt 
    } = body;

    // バリデーション
    if (!postId || !userId) {
      return NextResponse.json(
        { error: 'postIdとuserIdが必要です' },
        { status: 400 }
      );
    }

    const analyticsData = {
      id: 'analytics_' + Date.now(),
      postId,
      userId,
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      shares: parseInt(shares) || 0,
      reach: parseInt(reach) || 0,
      engagementRate: parseFloat(engagementRate) || 0,
      profileClicks: parseInt(profileClicks) || 0,
      websiteClicks: parseInt(websiteClicks) || 0,
      storyViews: parseInt(storyViews) || 0,
      followerChange: parseInt(followerChange) || 0,
      publishedAt: new Date(publishedAt).toISOString(),
      createdAt: new Date().toISOString()
    };

    // 既存データを読み込み
    const existingData = await readAnalyticsData();
    
    // 新しいデータを追加
    const updatedData = [analyticsData, ...existingData];
    
    // データを保存
    await writeAnalyticsData(updatedData);
    
    console.log('Analytics data saved to file:', analyticsData);
    
    return NextResponse.json({
      id: analyticsData.id,
      message: '分析データが保存されました',
      data: analyticsData
    });

  } catch (error) {
    console.error('分析データ保存エラー:', error);
    return NextResponse.json(
      { error: '分析データの保存に失敗しました' },
      { status: 500 }
    );
  }
}

// 分析データ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const postId = searchParams.get('postId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // データを読み込み
    const allData = await readAnalyticsData();
    
    // フィルタリング
    let filteredData = allData;
    
    if (userId) {
      filteredData = filteredData.filter((item: Record<string, unknown>) => item.userId === userId);
    }
    
    if (postId) {
      filteredData = filteredData.filter((item: Record<string, unknown>) => item.postId === postId);
    }
    
    // 制限
    const analytics = filteredData.slice(0, limit);

    console.log('Fetched analytics from file:', analytics.length, 'records');

    return NextResponse.json({
      analytics,
      total: filteredData.length
    });

  } catch (error) {
    console.error('分析データ取得エラー:', error);
    return NextResponse.json({
      analytics: [],
      total: 0
    });
  }
}
