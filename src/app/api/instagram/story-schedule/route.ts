import { NextRequest, NextResponse } from 'next/server';

// iPad Safari対応: Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('=== STORY SCHEDULE API CALLED ===');
    
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
    console.error('=== STORY SCHEDULE ERROR ===');
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
    context += `ターゲット市場: ${businessInfo.targetMarket.join(', ')}\n`;
  }
  
  if (businessInfo.goals && businessInfo.goals.length > 0) {
    context += `目標: ${businessInfo.goals.join(', ')}\n`;
  }
  
  if (businessInfo.challenges && businessInfo.challenges.length > 0) {
    context += `課題: ${businessInfo.challenges.join(', ')}\n`;
  }
  
  if (businessInfo.features && businessInfo.features.length > 0) {
    context += `機能: ${businessInfo.features.join(', ')}\n`;
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
あなたはInstagramストーリー投稿の専門家です。以下の情報を基に、週間投稿スケジュールを提案してください。

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
7. ストーリー投稿に特化した内容（日常の瞬間、裏側の様子、限定情報、Q&A、ポールなど）にしてください
8. 各投稿文は2行程度の短い文にしてください（ストーリーは長文投稿が少ないため）
9. 絵文字を効果的に使用して親しみやすさを演出してください

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
          "category": "日常の瞬間"
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
  // OpenAI APIの実装（実際のAPIキーが必要）
  // 現在はモックデータを返す
  // プロンプトから投稿頻度を抽出（簡易的な実装）
  const weeklyPostsMatch = prompt.match(/週の投稿回数: (\d+)回/);
  const weeklyPosts = weeklyPostsMatch ? parseInt(weeklyPostsMatch[1]) : 2;
  
  // 投稿する曜日を決定（週の投稿回数に基づく）
  const postingDays: string[] = [];
  
  if (weeklyPosts === 1) {
    postingDays.push("水"); // 週1回は水曜日
  } else if (weeklyPosts === 2) {
    postingDays.push("月", "木"); // 週2回は月・木
  } else if (weeklyPosts === 3) {
    postingDays.push("月", "水", "金"); // 週3回は月・水・金
  } else if (weeklyPosts === 4) {
    postingDays.push("月", "火", "木", "金"); // 週4回は月・火・木・金
  } else if (weeklyPosts === 5) {
    postingDays.push("月", "火", "水", "木", "金"); // 週5回は平日
  } else if (weeklyPosts === 6) {
    postingDays.push("月", "火", "水", "木", "金", "土"); // 週6回は土曜日まで
  } else if (weeklyPosts === 7) {
    postingDays.push("月", "火", "水", "木", "金", "土", "日"); // 毎日
  }
  
  const dayNames = ["月", "火", "水", "木", "金", "土", "日"];
  
  const mockSchedule = dayNames.map(day => {
    const isPostingDay = postingDays.includes(day);
    
    let posts: Array<{ title: string; description: string; emoji: string; category: string }> = [];
    if (isPostingDay) {
      // 投稿する曜日に応じて内容を決定
      if (day === "月") {
        posts = [{
          title: "週の始まり✨",
          description: "新しい週のスタート！\n今日も頑張りましょう💪",
          emoji: "🌅",
          category: "モチベーション"
        }];
      } else if (day === "火") {
        posts = [{
          title: "商品の裏側🔍",
          description: "制作過程をちょっとだけ\nお見せします📦",
          emoji: "🔍",
          category: "裏側の様子"
        }];
      } else if (day === "水") {
        posts = [{
          title: "お客様の声💬",
          description: "嬉しいお声をいただきました！\nありがとうございます🙏",
          emoji: "💬",
          category: "お客様の声"
        }];
      } else if (day === "木") {
        posts = [{
          title: "Q&Aタイム❓",
          description: "何か質問はありますか？\nコメントでお聞かせください💭",
          emoji: "❓",
          category: "Q&A"
        }];
      } else if (day === "金") {
        posts = [{
          title: "週末モード🎉",
          description: "金曜日！\n素敵な週末をお過ごしください✨",
          emoji: "🎉",
          category: "エンターテイメント"
        }];
      } else if (day === "土") {
        posts = [{
          title: "週末の過ごし方🌅",
          description: "リラックスした週末の様子\nお疲れ様でした✨",
          emoji: "🌅",
          category: "ライフスタイル"
        }];
      } else if (day === "日") {
        posts = [{
          title: "週の振り返り💭",
          description: "今週の振り返りと\n来週の予告です📅",
          emoji: "💭",
          category: "振り返り"
        }];
      }
    }
    
    return {
      day: day,
      dayName: getDayName(day),
      posts: posts
    };
  });

  return mockSchedule;
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
