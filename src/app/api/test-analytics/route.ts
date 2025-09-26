import { NextRequest, NextResponse } from 'next/server';

// テスト用の簡単なAPI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Test analytics API received:', body);
    
    return NextResponse.json({
      id: 'test_' + Date.now(),
      message: 'テストデータが保存されました',
      data: body
    });
  } catch (error) {
    console.error('Test analytics error:', error);
    return NextResponse.json(
      { error: 'テストデータの保存に失敗しました' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    console.log('Test analytics GET for userId:', userId);
    
    return NextResponse.json({
      analytics: [
        {
          id: 'test_1',
          userId: userId,
          likes: 100,
          comments: 10,
          shares: 5,
          reach: 500,
          engagementRate: 23.0,
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      ],
      total: 1
    });
  } catch (error) {
    console.error('Test analytics GET error:', error);
    return NextResponse.json({
      analytics: [],
      total: 0
    });
  }
}
