import { NextRequest, NextResponse } from 'next/server';

// iPad Safari対応: Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('=== REEL SCHEDULE API CALLED ===');
    
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
    console.error('=== REEL SCHEDULE ERROR ===');
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
  targetMarket?: string[] | string;
  goals?: string[];
  challenges?: string[];
  features?: string[];
  industry?: string;
  productsOrServices?: Array<{ name: string; details: string }>;
  snsAISettings?: Record<string, unknown>;
}) {
  const context = [];
  
  if (businessInfo.industry) {
    context.push(`業種: ${businessInfo.industry}`);
  }
  
  if (businessInfo.companySize) {
    context.push(`会社規模: ${businessInfo.companySize}`);
  }
  
  if (businessInfo.businessType) {
    context.push(`事業形態: ${businessInfo.businessType}`);
  }
  
  if (businessInfo.description) {
    context.push(`事業内容: ${businessInfo.description}`);
  }
  
  if (businessInfo.catchphrase) {
    context.push(`キャッチコピー: ${businessInfo.catchphrase}`);
  }
  
  if (businessInfo.targetMarket && businessInfo.targetMarket.length > 0) {
    context.push(`ターゲット市場: ${Array.isArray(businessInfo.targetMarket) ? businessInfo.targetMarket.join(', ') : businessInfo.targetMarket}`);
  }
  
  if (businessInfo.goals && businessInfo.goals.length > 0) {
    context.push(`目標: ${Array.isArray(businessInfo.goals) ? businessInfo.goals.join(', ') : businessInfo.goals}`);
  }
  
  if (businessInfo.challenges && businessInfo.challenges.length > 0) {
    context.push(`課題: ${Array.isArray(businessInfo.challenges) ? businessInfo.challenges.join(', ') : businessInfo.challenges}`);
  }
  
  if (businessInfo.features && businessInfo.features.length > 0) {
    context.push(`機能: ${Array.isArray(businessInfo.features) ? businessInfo.features.join(', ') : businessInfo.features}`);
  }
  
  if (businessInfo.productsOrServices && businessInfo.productsOrServices.length > 0) {
    context.push(`商品・サービス:`);
    businessInfo.productsOrServices.forEach((item, index) => {
      context.push(`  ${index + 1}. ${item.name}${item.details ? ` - ${item.details}` : ''}`);
    });
  }
  
  // Instagram AI設定の情報を追加
  if (businessInfo.snsAISettings && businessInfo.snsAISettings.instagram) {
    const instagramSettings = businessInfo.snsAISettings.instagram as Record<string, unknown>;
    if (instagramSettings.tone) {
      context.push(`Instagramトーン: ${instagramSettings.tone}`);
    }
    if (instagramSettings.manner) {
      context.push(`Instagramマナー: ${instagramSettings.manner}`);
    }
    if (instagramSettings.goals) {
      context.push(`Instagram目標: ${instagramSettings.goals}`);
    }
    if (instagramSettings.motivation) {
      context.push(`Instagram運用動機: ${instagramSettings.motivation}`);
    }
    if (instagramSettings.cautions) {
      context.push(`Instagram注意事項: ${instagramSettings.cautions}`);
    }
  }

  return context.join('\n');
}

function buildSchedulePrompt(monthlyPosts: number, dailyPosts: number, context: string) {
  const weeklyPostCount = Math.round(monthlyPosts / 4);
  const postingDaysPerWeek = Math.round(monthlyPosts / 4);
  
  return `
あなたはInstagramリール投稿の専門家です。以下の情報を基に、週間投稿スケジュールを提案してください。

【重要：投稿頻度の設定】
- 月間の投稿回数: ${monthlyPosts}回
- 1日の投稿回数: ${dailyPosts}回
- 週間の投稿回数: ${weeklyPostCount}回
- 投稿する曜日の数: 週${postingDaysPerWeek}日のみ投稿

【重要な指示】
1. **週${postingDaysPerWeek}日のみ投稿してください**（月〜日のうち${postingDaysPerWeek}日のみ）
2. **投稿しない曜日は必ず空の配列にしてください**
3. 各曜日に投稿する場合は、${dailyPosts}件の投稿内容を提案してください

【投稿する曜日の選び方】
- 週2回（${postingDaysPerWeek}日）の場合：例）月・水、火・木、水・金、木・土、金・日など
- 週3回（${postingDaysPerWeek}日）の場合：例）月・水・金、火・木・土、水・金・日など
- 週4回（${postingDaysPerWeek}日）の場合：例）月・火・木・金、火・水・金・土など
- 他の頻度の場合も同様に、週${postingDaysPerWeek}日のみを選んでください

【ビジネス情報】
${context}

【要求事項】
1. 上記の投稿頻度を厳密に守ってください（週${postingDaysPerWeek}日のみ投稿）
2. ビジネス情報に基づいて、ターゲット層に響く内容にしてください
3. 各投稿内容は具体的で実行可能なものにしてください
4. 曜日ごとに異なるアプローチを取り、バリエーションを持たせてください
5. エンゲージメントを高めるような内容を心がけてください

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
          "emoji": "📱",
          "category": "カテゴリ"
        }
      ]
    }
  ]
}
`;
}

async function generateScheduleWithAI(prompt: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたはInstagramリール投稿の専門家です。ビジネス情報に基づいて最適な週間投稿スケジュールを提案してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('AI response is empty');
    }

    // JSONをパース
    const parsedContent = JSON.parse(content);
    return parsedContent.schedule || [];

  } catch (error) {
    console.error('OpenAI API呼び出しエラー:', error);
    
    // フォールバック: デフォルトスケジュールを返す
    return getDefaultSchedule();
  }
}

function getDefaultSchedule() {
  // デフォルトは週2回（月8回）のスケジュール
  const weeklyPosts = 2;
  
  // 投稿する曜日を決定（週の投稿回数に基づく）
  const postingDays: string[] = [];
  
  // 週2回のスケジュールを設定
  postingDays.push("月", "木"); // 週2回は月・木
  
  const dayNames = ["月", "火", "水", "木", "金", "土", "日"];
  
  return dayNames.map(day => {
    const isPostingDay = postingDays.includes(day);
    
    let posts: Array<{ title: string; description: string; emoji: string; category: string }> = [];
    if (isPostingDay) {
      // 投稿する曜日に応じて内容を決定
      if (day === "月") {
        posts = [{
          title: "商品紹介リール",
          description: "新商品やおすすめ商品を魅力的に紹介",
          emoji: "📱",
          category: "商品紹介"
        }];
      } else if (day === "火") {
        posts = [{
          title: "おすすめポイント",
          description: "商品の特徴やメリットを強調",
          emoji: "💡",
          category: "おすすめ"
        }];
      } else if (day === "水") {
        posts = [{
          title: "成功事例紹介",
          description: "お客様の成功事例や体験談",
          emoji: "🏆",
          category: "成功事例"
        }];
      } else if (day === "木") {
        posts = [{
          title: "新商品発表",
          description: "新商品の発表や予告",
          emoji: "🌱",
          category: "新商品"
        }];
      } else if (day === "金") {
        posts = [{
          title: "週末特集",
          description: "週末の過ごし方やおすすめスポット",
          emoji: "🎉",
          category: "週末特集"
        }];
      } else if (day === "土") {
        posts = [{
          title: "エンターテイメント",
          description: "楽しい動画やエンターテイメント",
          emoji: "🎪",
          category: "エンターテイメント"
        }];
      } else if (day === "日") {
        posts = [{
          title: "週末の過ごし方",
          description: "リラックスした週末の様子",
          emoji: "🌅",
          category: "ライフスタイル"
        }];
      }
    }
    
    return {
      day: day,
      dayName: getDayName(day),
      posts: posts
    };
  });
}

function getDayName(day: string): string {
  const dayMap: { [key: string]: string } = {
    "月": "Monday",
    "火": "Tuesday", 
    "水": "Wednesday",
    "木": "Thursday",
    "金": "Friday",
    "土": "Saturday",
    "日": "Sunday"
  };
  return dayMap[day] || day;
}
