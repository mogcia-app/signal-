import { NextRequest, NextResponse } from 'next/server';

// iPad Safari対応: Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('=== FEED SCHEDULE API CALLED ===');
    
    // iPad Chrome対応: User-Agentをチェック
    const userAgent = request.headers.get('user-agent') || '';
    const isIPadChrome = /iPad.*Chrome/i.test(userAgent);
    console.log('User-Agent:', userAgent);
    console.log('Is iPad Chrome:', isIPadChrome);
    
    const body = await request.json();
    console.log('Request body:', { 
      monthlyPosts: body.monthlyPosts, 
      dailyPosts: body.dailyPosts, 
      hasBusinessInfo: !!body.businessInfo 
    });
    
    const { 
      monthlyPosts, 
      dailyPosts, 
      businessInfo 
    } = body;

    if (!monthlyPosts || !dailyPosts || !businessInfo) {
      console.error('Missing required parameters:', { monthlyPosts, dailyPosts, businessInfo });
      return NextResponse.json({ 
        success: false,
        error: '必要なパラメータが不足しています',
        details: { monthlyPosts, dailyPosts, hasBusinessInfo: !!businessInfo }
      }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // iPad Chrome対応: ビジネス情報を軽量化
    let optimizedBusinessInfo = businessInfo;
    if (isIPadChrome) {
      console.log('🔄 Optimizing business info for iPad Chrome...');
      optimizedBusinessInfo = {
        industry: businessInfo.industry,
        companySize: businessInfo.companySize,
        businessType: businessInfo.businessType,
        description: businessInfo.description?.substring(0, 200), // 200文字に制限
        targetMarket: Array.isArray(businessInfo.targetMarket) ? 
          businessInfo.targetMarket.slice(0, 3) : businessInfo.targetMarket, // 3つまで
        goals: businessInfo.goals?.slice(0, 3), // 3つまで
        snsAISettings: businessInfo.snsAISettings
      };
      console.log('Optimized business info size:', JSON.stringify(optimizedBusinessInfo).length, 'characters');
    }

    // ビジネス情報からコンテキストを構築
    const context = buildBusinessContext(optimizedBusinessInfo);
    console.log('Business context built:', context.length, 'characters');
    
    // AIプロンプトを構築
    const prompt = buildSchedulePrompt(monthlyPosts, dailyPosts, context);

    // OpenAI APIを呼び出してスケジュールを生成
    const scheduleResponse = await generateScheduleWithAI(prompt);
    console.log('Schedule generated:', scheduleResponse.length, 'days');

    // iPad Chrome対応: レスポンスサイズをチェック
    const responseData = {
      success: true,
      schedule: scheduleResponse,
      timestamp: new Date().toISOString(),
      isIPadOptimized: isIPadChrome
    };
    
    const responseSize = JSON.stringify(responseData).length;
    console.log('Response size:', responseSize, 'characters');
    
    if (isIPadChrome && responseSize > 50000) {
      console.warn('⚠️ Large response detected for iPad Chrome, optimizing...');
      // iPad Chrome用にスケジュールを簡略化
      const optimizedSchedule = scheduleResponse.map((day: { day: string; dayName: string; posts: Array<{ title: string; description: string; emoji: string; category: string }> }) => ({
        day: day.day,
        dayName: day.dayName,
        posts: day.posts.map((post: { title: string; description: string; emoji: string; category: string }) => ({
          title: post.title,
          description: post.description?.substring(0, 100), // 100文字に制限
          emoji: post.emoji,
          category: post.category
        }))
      }));
      
      responseData.schedule = optimizedSchedule;
      console.log('Optimized response size:', JSON.stringify(responseData).length, 'characters');
    }

    // iPad Safari対応: 明示的なContent-Typeとキャッシュ制御
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('=== FEED SCHEDULE ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({ 
      success: false,
      error: 'スケジュール生成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

function buildBusinessContext(businessInfo: {
  companySize?: string;
  businessType?: string;
  description?: string;
  catchphrase?: string;
  targetMarket?: string[];
  goals?: string[];
  challenges?: string[];
  features?: string[];
  industry?: string;
  productsOrServices?: Array<{ name: string; details: string }>;
  snsAISettings?: Record<string, unknown>;
}) {
  let context = '';
  
  if (businessInfo.industry) {
    context += `業種: ${businessInfo.industry}\n`;
  }
  
  if (businessInfo.companySize) {
    context += `会社規模: ${businessInfo.companySize}\n`;
  }
  
  if (businessInfo.businessType) {
    context += `事業形態: ${businessInfo.businessType}\n`;
  }
  
  if (businessInfo.description) {
    context += `事業内容: ${businessInfo.description}\n`;
  }
  
  if (businessInfo.catchphrase) {
    context += `キャッチコピー: ${businessInfo.catchphrase}\n`;
  }
  
  if (businessInfo.targetMarket && businessInfo.targetMarket.length > 0) {
    context += `ターゲット市場: ${Array.isArray(businessInfo.targetMarket) ? businessInfo.targetMarket.join(', ') : businessInfo.targetMarket}\n`;
  }
  
  if (businessInfo.goals && businessInfo.goals.length > 0) {
    context += `目標: ${Array.isArray(businessInfo.goals) ? businessInfo.goals.join(', ') : businessInfo.goals}\n`;
  }
  
  if (businessInfo.challenges && businessInfo.challenges.length > 0) {
    context += `課題: ${Array.isArray(businessInfo.challenges) ? businessInfo.challenges.join(', ') : businessInfo.challenges}\n`;
  }
  
  if (businessInfo.features && businessInfo.features.length > 0) {
    context += `機能: ${Array.isArray(businessInfo.features) ? businessInfo.features.join(', ') : businessInfo.features}\n`;
  }
  
  if (businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0) {
    context += `商品・サービス:\n`;
    businessInfo.productsOrServices.forEach((item, index) => {
      context += `  ${index + 1}. ${item.name}`;
      if (item.details) {
        context += ` - ${item.details}`;
      }
      context += '\n';
    });
  }
  
  // Instagram AI設定の情報を追加
  if (businessInfo.snsAISettings && businessInfo.snsAISettings.instagram) {
    const instagramSettings = businessInfo.snsAISettings.instagram as Record<string, unknown>;
    if (instagramSettings.tone) {
      context += `Instagramトーン: ${instagramSettings.tone}\n`;
    }
    if (instagramSettings.manner) {
      context += `Instagramマナー: ${instagramSettings.manner}\n`;
    }
    if (instagramSettings.goals) {
      context += `Instagram目標: ${instagramSettings.goals}\n`;
    }
    if (instagramSettings.motivation) {
      context += `Instagram運用動機: ${instagramSettings.motivation}\n`;
    }
    if (instagramSettings.cautions) {
      context += `Instagram注意事項: ${instagramSettings.cautions}\n`;
    }
  }
  
  return context;
}

function buildSchedulePrompt(monthlyPosts: number, dailyPosts: number, context: string) {
  return `
あなたはInstagramフィード投稿の専門家です。以下の情報を基に、週間投稿スケジュールを提案してください。

【投稿頻度】
- 1ヶ月の投稿回数: ${monthlyPosts}回
- 1日の投稿回数: ${dailyPosts}回
- 週の投稿回数: ${Math.round(monthlyPosts / 4)}回（月${monthlyPosts}回 ÷ 4週）
- 投稿する曜日数: ${Math.round(monthlyPosts / 4)}日/週

【ビジネス情報】
${context}

【要求事項】
1. 投稿頻度に基づいて、投稿する曜日を選択してください
   - 週2回の場合：月・水、火・木、水・金、木・土、金・日などから選択
   - 週3回の場合：月・水・金、火・木・土、水・金・日などから選択
   - 週4回の場合：月・火・木・金、火・水・金・土などから選択
   - 毎日の場合：月〜日すべて
2. 選択した曜日のみに投稿内容を提案し、投稿しない曜日は空の配列にしてください
3. ビジネス情報に基づいて、ターゲット層に響く内容にしてください
4. 各投稿内容は具体的で実行可能なものにしてください
5. 曜日ごとに異なるアプローチを取り、バリエーションを持たせてください
6. エンゲージメントを高めるような内容を心がけてください
7. フィード投稿に特化した内容（写真中心、ストーリーテリング、商品紹介など）にしてください

【出力形式】
以下のJSON形式で回答してください：
{
  "schedule": [
    {
      "day": "月",
      "dayName": "Monday",
      "posts": [
        {
          "title": "投稿タイトル",
          "description": "投稿内容の説明",
          "emoji": "📸",
          "category": "商品紹介"
        }
      ]
    },
    {
      "day": "火",
      "dayName": "Tuesday",
      "posts": []
    },
    // ... 他の曜日 ...
  ]
}
`;
}

async function generateScheduleWithAI(prompt: string) {
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
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AIからの応答がありません');
    }

    const parsedContent = JSON.parse(content);
    
    // スケジュールデータを整形
    if (parsedContent.schedule && Array.isArray(parsedContent.schedule)) {
      return parsedContent.schedule;
    }
    
    throw new Error('スケジュールデータの形式が正しくありません');
    
  } catch (error) {
    console.error('OpenAI API エラー:', error);
    throw error;
  }
}

