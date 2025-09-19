import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    // 環境変数の確認
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json({
        error: 'OpenAI API key not found',
        hasKey: false,
        nodeEnv: process.env.NODE_ENV
      }, { status: 500 });
    }

    // 簡単なテストレスポンス
    return NextResponse.json({
      success: true,
      message: `Received: ${message}`,
      hasKey: true,
      keyLength: openaiApiKey.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}
