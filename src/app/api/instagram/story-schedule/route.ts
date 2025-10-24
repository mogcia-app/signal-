import { NextRequest, NextResponse } from 'next/server';

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
      schedule: scheduleResponse
    });

  } catch (error) {
    console.error('スケジュール生成エラー:', error);
    return NextResponse.json({ error: 'スケジュール生成に失敗しました' }, { status: 500 });
  }
}

function buildBusinessContext(businessInfo: {
  companySize?: string;
  targetMarket?: string[];
  goals?: string[];
  challenges?: string[];
  features?: string[];
  industry?: string;
  businessType?: string;
  tone?: string;
  targetAudience?: string;
}) {
  let context = '';
  
  if (businessInfo.companySize) {
    context += `会社規模: ${businessInfo.companySize}\n`;
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
  
  if (businessInfo.industry) {
    context += `業種: ${businessInfo.industry}\n`;
  }
  
  if (businessInfo.businessType) {
    context += `ビジネスタイプ: ${businessInfo.businessType}\n`;
  }
  
  if (businessInfo.tone) {
    context += `トーン: ${businessInfo.tone}\n`;
  }
  
  if (businessInfo.targetAudience) {
    context += `ターゲット層: ${businessInfo.targetAudience}\n`;
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
  const mockSchedule = [
    {
      day: "月",
      dayName: "Monday",
      posts: [
        {
          title: "週の始まり✨",
          description: "新しい週のスタート！\n今日も頑張りましょう💪",
          emoji: "🌅",
          category: "モチベーション"
        }
      ]
    },
    {
      day: "火",
      dayName: "Tuesday",
      posts: [
        {
          title: "商品の裏側🔍",
          description: "制作過程をちょっとだけ\nお見せします📦",
          emoji: "🔍",
          category: "裏側の様子"
        }
      ]
    },
    {
      day: "水",
      dayName: "Wednesday",
      posts: [
        {
          title: "お客様の声💬",
          description: "嬉しいお声をいただきました！\nありがとうございます🙏",
          emoji: "💬",
          category: "お客様の声"
        }
      ]
    },
    {
      day: "木",
      dayName: "Thursday",
      posts: [
        {
          title: "Q&Aタイム❓",
          description: "何か質問はありますか？\nコメントでお聞かせください💭",
          emoji: "❓",
          category: "Q&A"
        }
      ]
    },
    {
      day: "金",
      dayName: "Friday",
      posts: [
        {
          title: "週末モード🎉",
          description: "金曜日！\n素敵な週末をお過ごしください✨",
          emoji: "🎉",
          category: "エンターテイメント"
        }
      ]
    },
    {
      day: "土",
      dayName: "Saturday",
      posts: []
    },
    {
      day: "日",
      dayName: "Sunday",
      posts: []
    }
  ];

  return mockSchedule;
}
