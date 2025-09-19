import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Firebase Functions の aiChat を呼び出し
    const baseUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 
      (process.env.NODE_ENV === 'development' 
        ? 'http://127.0.0.1:5001/signal-v1-fc481/us-central1'
        : 'https://us-central1-signal-v1-fc481.cloudfunctions.net');

    const response = await fetch(`${baseUrl}/aiChat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'AI Chat API call failed');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: 'AI Chat processing failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
