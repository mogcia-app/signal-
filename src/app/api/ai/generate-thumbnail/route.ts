import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { postContent } = await request.json();

    if (!postContent || !postContent.trim()) {
      return NextResponse.json(
        { error: '投稿文が必要です' },
        { status: 400 }
      );
    }

    // 投稿文からサムネ画像用のプロンプトを生成
    const prompt = `Create a minimalist black and white Instagram thumbnail image for the following post content: "${postContent}". 
    
    Requirements:
    - Black and white only (no colors)
    - Minimalist design
    - Instagram-friendly square format
    - Clean, modern aesthetic
    - Abstract or conceptual representation
    - High contrast
    - Professional look`;

    console.log('Generating thumbnail with prompt:', prompt);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
      style: "natural"
    });

    const imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: '画像生成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      prompt: prompt
    });

  } catch (error) {
    console.error('Thumbnail generation error:', error);
    
    // OpenAI API エラーの詳細を取得
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: '画像生成に失敗しました',
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '画像生成に失敗しました' },
      { status: 500 }
    );
  }
}
