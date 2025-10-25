import { NextRequest, NextResponse } from 'next/server';

// iPad Safari対応: Node.jsランタイムを明示的に指定
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      monthlyPosts, 
      dailyPosts, 
      businessInfo 
    } = body;

    if (!monthlyPosts || !dailyPosts || !businessInfo) {
      return NextResponse.json({ error: '必要なパラメータが不足しています' }, { status: 400 });
    }

    // ビジネス情報からコンテキストを構築
    const context = buildBusinessContext(businessInfo);
    
    // AIプロンプトを構築
    const prompt = buildSchedulePrompt(monthlyPosts, dailyPosts, context);

    // OpenAI APIを呼び出してスケジュールを生成
    const scheduleResponse = await generateScheduleWithAI(prompt);

    return NextResponse.json({
      success: true,
      schedule: scheduleResponse
    });

  } catch (error) {
    console.error('スケジュール生成エラー:', error);
    return NextResponse.json({ error: 'スケジュール生成に失敗しました' }, { status: 500 });
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
    context.push(`目標: ${businessInfo.goals.join(', ')}`);
  }
  
  if (businessInfo.challenges && businessInfo.challenges.length > 0) {
    context.push(`課題: ${businessInfo.challenges.join(', ')}`);
  }
  
  if (businessInfo.features && businessInfo.features.length > 0) {
    context.push(`機能: ${businessInfo.features.join(', ')}`);
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
  return `
あなたはInstagramリール投稿の専門家です。以下の情報を基に、週間投稿スケジュールを提案してください。

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
        model: 'gpt-4',
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
