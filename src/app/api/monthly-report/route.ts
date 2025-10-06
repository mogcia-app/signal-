import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // リダイレクトまたはデフォルトのレスポンス
    return NextResponse.json({
      message: 'Monthly Report API endpoint',
      availableEndpoints: [
        '/api/analytics/monthly-report-summary',
        '/api/analytics/monthly-review',
        '/api/analytics/monthly-summary',
        '/api/ai/monthly-analysis'
      ]
    });
  } catch (error) {
    console.error('Monthly Report API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      message: 'Monthly Report POST endpoint',
      receivedData: body
    });
  } catch (error) {
    console.error('Monthly Report POST error:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
