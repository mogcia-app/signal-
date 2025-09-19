import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // OpenAI API を直接呼び出し
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OpenAI API key not found');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // プロンプトを構築
    const systemPrompt = `あなたはInstagram運用の専門家です。ユーザーの計画内容とシミュレーション結果を基に、具体的で実用的なアドバイスを提供してください。

現在の計画内容:
${context ? JSON.stringify(context, null, 2) : '計画情報なし'}

ユーザーの質問に日本語で回答してください。専門的でありながら分かりやすく、実行可能な提案を心がけてください。`;

    console.log('AI Chat request:', { message, hasContext: !!context });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'OpenAI API call failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '申し訳ございません。回答を生成できませんでした。';

    console.log('AI Chat response generated:', { 
      responseLength: aiResponse.length,
      tokensUsed: data.usage?.total_tokens 
    });

    return NextResponse.json({
      response: aiResponse,
      tokensUsed: data.usage?.total_tokens,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: 'AI Chat processing failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
