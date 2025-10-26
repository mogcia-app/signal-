import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, businessInfo } = body;

    if (!content || !businessInfo) {
      return NextResponse.json({ error: '必要なパラメータが不足しています' }, { status: 400 });
    }

    // ビジネス情報からコンテキストを構築
    const context = buildBusinessContext(businessInfo);
    
    // AIプロンプトを構築
    const prompt = buildSuggestionsPrompt(content, context);

    // OpenAI APIを呼び出して提案を生成
    const suggestionsResponse = await generateSuggestionsWithAI(prompt);

    return NextResponse.json({
      suggestions: suggestionsResponse
    });

  } catch (error) {
    console.error('フィードAIヒント生成エラー:', error);
    return NextResponse.json({ error: 'フィードAIヒント生成に失敗しました' }, { status: 500 });
  }
}

function buildBusinessContext(businessInfo: Record<string, unknown>): string {
  const context = [];
  
  if (businessInfo.companySize) {
    context.push(`会社規模: ${businessInfo.companySize}`);
  }
  
  if (businessInfo.targetMarket && Array.isArray(businessInfo.targetMarket)) {
    context.push(`ターゲット市場: ${Array.isArray(businessInfo.targetMarket) ? businessInfo.targetMarket.join(', ') : businessInfo.targetMarket}`);
  }
  
  if (businessInfo.goals && Array.isArray(businessInfo.goals)) {
    context.push(`目標: ${Array.isArray(businessInfo.goals) ? businessInfo.goals.join(', ') : businessInfo.goals}`);
  }
  
  if (businessInfo.challenges && Array.isArray(businessInfo.challenges)) {
    context.push(`課題: ${Array.isArray(businessInfo.challenges) ? businessInfo.challenges.join(', ') : businessInfo.challenges}`);
  }
  
  if (businessInfo.features && Array.isArray(businessInfo.features)) {
    context.push(`機能: ${Array.isArray(businessInfo.features) ? businessInfo.features.join(', ') : businessInfo.features}`);
  }
  
  if (businessInfo.industry) {
    context.push(`業種: ${businessInfo.industry}`);
  }
  
  return context.join('\n');
}

function buildSuggestionsPrompt(content: string, context: string) {
  return `
あなたはInstagramフィード投稿の専門家です。以下の投稿文とビジネス情報を基に、AIが生成した投稿文に合う画像の枚数やサムネイルのアイデアとフィードのヒントを提案してください。

【投稿文】
${content}

【ビジネス情報】
${context}

【要求事項】
1. AIが生成した投稿文の内容に合った画像の枚数を提案してください（1枚〜10枚の範囲で）
2. Instagramフィードの特徴（正方形、高品質、ストーリーテリング重視）を考慮してください
3. ビジネス情報を参考に、ターゲット層に響く内容にしてください
4. フィード投稿の効果的なヒントやコツも含めてください
5. エンゲージメントを高めるための具体的なアイデアを提案してください
6. 投稿文の内容をより魅力的に見せるための工夫も提案してください
7. サムネイル（メイン画像）のアイデアも含めてください

【出力形式】
以下の形式で回答してください：

📸 画像の枚数
[投稿文に合った画像の枚数]枚

🖼️ サムネイルのアイデア
[投稿文に合った具体的なサムネイルのアイデア]

💡 フィードのヒント
[投稿文をより魅力的に見せるための工夫、エンゲージメントを高めるコツ、撮影時の注意点など]
`;
}

async function generateSuggestionsWithAI(prompt: string) {
  const { default: OpenAI } = await import('openai');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AIからの応答がありません');
    }

    return content;
    
  } catch (error) {
    console.error('OpenAI API エラー:', error);
    throw error;
  }
}


