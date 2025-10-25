import { NextRequest, NextResponse } from 'next/server';

// iPad Safari対応: Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('=== FEED SCHEDULE API CALLED ===');
    
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

    // ビジネス情報からコンテキストを構築
    const context = buildBusinessContext(businessInfo);
    console.log('Business context built:', context.length, 'characters');
    
    // AIプロンプトを構築
    const prompt = buildSchedulePrompt(monthlyPosts, dailyPosts, context);

    // OpenAI APIを呼び出してスケジュールを生成
    const scheduleResponse = await generateScheduleWithAI(prompt);
    console.log('Schedule generated:', scheduleResponse.length, 'days');

    // iPad Safari対応: 明示的なContent-Typeとキャッシュ制御
    return NextResponse.json({
      success: true,
      schedule: scheduleResponse,
      timestamp: new Date().toISOString()
    }, {
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
  // OpenAI APIの実装（実際のAPIキーが必要）
  // 現在はモックデータを返す
  // プロンプトから投稿頻度を抽出（簡易的な実装）
  const weeklyPostsMatch = prompt.match(/週の投稿回数: (\d+)回/);
  const weeklyPosts = weeklyPostsMatch ? parseInt(weeklyPostsMatch[1]) : 2;
  
  // 投稿する曜日を決定（週の投稿回数に基づく）
  const postingDays: string[] = [];
  const dayNames = ["月", "火", "水", "木", "金", "土", "日"];
  
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
  
  const mockSchedule = dayNames.map(day => {
    const isPostingDay = postingDays.includes(day);
    
    let posts: Array<{ title: string; description: string; emoji: string; category: string }> = [];
    if (isPostingDay) {
      // 投稿する曜日に応じて内容を決定
      if (day === "月") {
        posts = [{
          title: "週の始まりのモチベーション投稿",
          description: "新しい週のスタートを切るためのインスピレーション投稿",
          emoji: "🌅",
          category: "モチベーション"
        }];
      } else if (day === "火") {
        posts = [{
          title: "商品・サービス紹介",
          description: "メイン商品やサービスの詳細紹介",
          emoji: "📦",
          category: "商品紹介"
        }];
      } else if (day === "水") {
        posts = [{
          title: "お客様の声・レビュー",
          description: "実際のお客様からのフィードバックやレビュー",
          emoji: "💬",
          category: "お客様の声"
        }];
      } else if (day === "木") {
        posts = [{
          title: "会社の取り組み・ストーリー",
          description: "会社の理念や取り組みについてのストーリー",
          emoji: "🏢",
          category: "会社紹介"
        }];
      } else if (day === "金") {
        posts = [{
          title: "週末に向けたエンターテイメント",
          description: "週末を楽しみにするような楽しいコンテンツ",
          emoji: "🎉",
          category: "エンターテイメント"
        }];
      } else if (day === "土") {
        posts = [{
          title: "週末の過ごし方",
          description: "リラックスした週末の様子",
          emoji: "🌅",
          category: "ライフスタイル"
        }];
      } else if (day === "日") {
        posts = [{
          title: "週の振り返り",
          description: "今週の振り返りや来週の予告",
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
