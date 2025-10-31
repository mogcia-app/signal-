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
    const scheduleResponse = await generateScheduleWithAI(prompt, monthlyPosts, dailyPosts);
    console.log('Schedule generated:', scheduleResponse.length, 'days');
    
    // 投稿頻度に合わせてスケジュールを調整（週の投稿回数に合うように）
    const adjustedSchedule = adjustScheduleToPostingFrequency(scheduleResponse, monthlyPosts, dailyPosts);
    console.log('Schedule adjusted to posting frequency:', adjustedSchedule.length, 'days');

    // iPad Chrome対応: レスポンスサイズをチェック
    const responseData = {
      success: true,
      schedule: adjustedSchedule,
      timestamp: new Date().toISOString(),
      isIPadOptimized: isIPadChrome
    };
    
    const responseSize = JSON.stringify(responseData).length;
    console.log('Response size:', responseSize, 'characters');
    
    if (isIPadChrome && responseSize > 50000) {
      console.warn('⚠️ Large response detected for iPad Chrome, optimizing...');
      // iPad Chrome用にスケジュールを簡略化
      const optimizedSchedule = adjustedSchedule.map((day: { day: string; dayName: string; posts: Array<{ title: string; description: string; emoji: string; category: string }> }) => ({
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
  const weeklyPostCount = Math.round(monthlyPosts / 4);
  const postingDaysPerWeek = Math.round(monthlyPosts / 4);
  
  // 週1回の場合は特に強調
  const frequencyNote = postingDaysPerWeek === 1 
    ? '\n【⚠️ 非常に重要】週1回（1日のみ）の投稿です。7日間のうち、投稿するのは1日だけです。他の6日は必ず空の配列（posts: []）にしてください。'
    : '';
  
  return `
あなたはInstagramストーリー投稿の専門家です。以下の情報を基に、週間投稿スケジュールを提案してください。

【重要：投稿頻度の設定】
- 月間の投稿回数: ${monthlyPosts}回
- 1日の投稿回数: ${dailyPosts}回
- 週間の投稿回数: ${weeklyPostCount}回
- 投稿する曜日の数: 週${postingDaysPerWeek}日のみ投稿${frequencyNote}

【重要な指示】
1. **週${postingDaysPerWeek}日のみ投稿してください**（月〜日のうち${postingDaysPerWeek}日のみ）
2. **投稿しない曜日は必ず空の配列（posts: []）にしてください**
3. 各曜日に投稿する場合は、${dailyPosts}件の投稿内容を提案してください
4. 7日間全ての曜日を含む配列を返してくださいが、投稿があるのは${postingDaysPerWeek}日のみです

【投稿する曜日の選び方】
${postingDaysPerWeek === 1 
  ? '- 週1回（1日のみ）の場合：例）月、火、水、木、金、土、日のいずれか1日のみ'
  : postingDaysPerWeek === 2
  ? '- 週2回（2日のみ）の場合：例）月・水、火・木、水・金、木・土、金・日など'
  : postingDaysPerWeek === 3
  ? '- 週3回（3日のみ）の場合：例）月・水・金、火・木・土、水・金・日など'
  : postingDaysPerWeek === 4
  ? '- 週4回（4日のみ）の場合：例）月・火・木・金、火・水・金・土など'
  : `- 週${postingDaysPerWeek}回（${postingDaysPerWeek}日のみ）の場合：適切に${postingDaysPerWeek}日を選んでください`
}

【ビジネス情報】
${context}

【要求事項】
1. 上記の投稿頻度を厳密に守ってください（週${postingDaysPerWeek}日のみ投稿、他の日は空配列）
2. ビジネス情報に基づいて、ターゲット層に響く内容にしてください
3. 各投稿内容は具体的で実行可能なものにしてください
4. 曜日ごとに異なるアプローチを取り、バリエーションを持たせてください
5. エンゲージメントを高めるような内容を心がけてください
6. ストーリー投稿に特化した内容（日常の瞬間、裏側の様子、限定情報、Q&A、ポールなど）にしてください
7. 各投稿文は2行程度の短い文にしてください（ストーリーは長文投稿が少ないため）
8. 絵文字を効果的に使用して親しみやすさを演出してください

【出力形式】
以下のJSON形式で回答してください。必ず7日間全てを含めてください：
{
  "schedule": [
    {
      "day": "月",
      "dayName": "Monday",
      "posts": []  // 投稿しない場合は空配列
    },
    {
      "day": "火",
      "dayName": "Tuesday",
      "posts": [
        {
          "title": "投稿タイトル",
          "description": "投稿内容の説明",
          "emoji": "📱",
          "category": "日常の瞬間"
        }
      ]
    }
    // ... 残りの曜日も同様に
  ]
}
`;
}

async function generateScheduleWithAI(prompt: string, monthlyPosts: number, dailyPosts: number) {
  const { default: OpenAI } = await import('openai');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたはInstagramストーリー投稿の専門家です。ビジネス情報に基づいて最適な週間投稿スケジュールを提案してください。指定された投稿頻度を厳密に守ってください。'
        },
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
    // フォールバック: デフォルトスケジュールを返す
    return getDefaultSchedule(monthlyPosts, dailyPosts);
  }
}

// スケジュールを投稿頻度に合わせて調整する関数
function adjustScheduleToPostingFrequency(
  schedule: Array<{
    day: string;
    dayName: string;
    posts: Array<{
      title: string;
      description: string;
      emoji: string;
      category: string;
    }>;
  }>,
  monthlyPosts: number,
  dailyPosts: number
): Array<{
  day: string;
  dayName: string;
  posts: Array<{
    title: string;
    description: string;
    emoji: string;
    category: string;
  }>;
}> {
  const weeklyPostCount = Math.round(monthlyPosts / 4);
  const postingDaysPerWeek = weeklyPostCount;
  
  // 全ての曜日を含むスケジュールを確保（7日間）
  const dayNames = ["月", "火", "水", "木", "金", "土", "日"];
  const dayNameMap: { [key: string]: string } = {
    "月": "Monday",
    "火": "Tuesday",
    "水": "Wednesday",
    "木": "Thursday",
    "金": "Friday",
    "土": "Saturday",
    "日": "Sunday"
  };
  
  // 既存のスケジュールから、投稿がある日を抽出
  const daysWithPosts = schedule.filter(day => 
    day.posts && Array.isArray(day.posts) && day.posts.length > 0
  );
  
  // 投稿がある日が指定された投稿回数を超えている場合は、最初のN日のみを残す
  const selectedDaysWithPosts = daysWithPosts.slice(0, postingDaysPerWeek);
  
  // 全ての曜日を含む新しいスケジュールを作成
  const adjustedSchedule = dayNames.map(day => {
    // この曜日に投稿があるかチェック
    const dayWithPosts = selectedDaysWithPosts.find(d => d.day === day);
    
    if (dayWithPosts && dayWithPosts.posts && dayWithPosts.posts.length > 0) {
      // 投稿がある場合、dailyPosts数に合わせて調整
      const posts = dayWithPosts.posts.slice(0, dailyPosts);
      return {
        day: day,
        dayName: dayNameMap[day] || getDayName(day),
        posts: posts
      };
    } else {
      // 投稿がない場合は空配列
      return {
        day: day,
        dayName: dayNameMap[day] || getDayName(day),
        posts: []
      };
    }
  });
  
  // 投稿がある日を確認
  const daysWithPostsInSchedule = adjustedSchedule.filter(day => day.posts.length > 0);
  const currentPostingDays = daysWithPostsInSchedule.length;
  
  // 投稿がある日が指定された投稿回数を超えている場合は、最初のN日のみを残す
  if (currentPostingDays > postingDaysPerWeek) {
    // 投稿がある日のインデックスを取得
    const postingDayIndices: number[] = [];
    adjustedSchedule.forEach((day, index) => {
      if (day.posts.length > 0) {
        postingDayIndices.push(index);
      }
    });
    
    // 超えている分の投稿を空にする（最初のN日以外）
    const daysToRemove = postingDayIndices.slice(postingDaysPerWeek);
    daysToRemove.forEach(index => {
      adjustedSchedule[index].posts = [];
    });
  }
  
  // 投稿がある日が指定された投稿回数より少ない場合は、ランダムに追加
  const finalPostingDays = adjustedSchedule.filter(day => day.posts.length > 0).length;
  if (finalPostingDays < postingDaysPerWeek) {
    const daysWithoutPosts = adjustedSchedule.filter(day => day.posts.length === 0);
    const daysToAdd = postingDaysPerWeek - finalPostingDays;
    
    for (let i = 0; i < Math.min(daysToAdd, daysWithoutPosts.length); i++) {
      const dayToAdd = daysWithoutPosts[i];
      // デフォルトの投稿内容を追加
      dayToAdd.posts = [{
        title: `${dayToAdd.day}曜日のストーリー投稿`,
        description: "投稿内容を追加してください",
        emoji: "📱",
        category: "投稿"
      }];
    }
  }
  
  return adjustedSchedule;
}

function getDefaultSchedule(monthlyPosts: number = 8, dailyPosts: number = 1) {
  const weeklyPostCount = Math.round(monthlyPosts / 4);
  const postingDaysPerWeek = weeklyPostCount;
  
  // 投稿する曜日を決定（週の投稿回数に基づく）
  const postingDays: string[] = [];
  
  // 週の投稿回数に応じて曜日を選択
  if (postingDaysPerWeek === 1) {
    postingDays.push("月"); // 週1回は月曜日
  } else if (postingDaysPerWeek === 2) {
    postingDays.push("月", "木"); // 週2回は月・木
  } else if (postingDaysPerWeek === 3) {
    postingDays.push("月", "水", "金"); // 週3回は月・水・金
  } else if (postingDaysPerWeek === 4) {
    postingDays.push("月", "火", "木", "金"); // 週4回は月・火・木・金
  } else if (postingDaysPerWeek === 5) {
    postingDays.push("月", "火", "水", "木", "金"); // 週5回
  } else if (postingDaysPerWeek === 6) {
    postingDays.push("月", "火", "水", "木", "金", "土"); // 週6回
  } else if (postingDaysPerWeek === 7) {
    postingDays.push("月", "火", "水", "木", "金", "土", "日"); // 毎日
  } else {
    // デフォルトは週2回
    postingDays.push("月", "木");
  }
  
  const dayNames = ["月", "火", "水", "木", "金", "土", "日"];
  
  const postTemplates: { [key: string]: Array<{ title: string; description: string; emoji: string; category: string }> } = {
    "月": [{
      title: "週始めの挨拶",
      description: "週の始まりを告げるストーリー",
      emoji: "📱",
      category: "日常の瞬間"
    }],
    "火": [{
      title: "裏側の様子",
      description: "仕事や日常の裏側を紹介",
      emoji: "💼",
      category: "裏側の様子"
    }],
    "水": [{
      title: "限定情報",
      description: "限定情報やお知らせ",
      emoji: "🎁",
      category: "限定情報"
    }],
    "木": [{
      title: "Q&A",
      description: "質問コーナーやお客様とのやり取り",
      emoji: "💬",
      category: "Q&A"
    }],
    "金": [{
      title: "週末の過ごし方",
      description: "週末の予定や過ごし方",
      emoji: "🎉",
      category: "週末特集"
    }],
    "土": [{
      title: "エンターテイメント",
      description: "楽しい投稿やエンターテイメント",
      emoji: "🎪",
      category: "エンターテイメント"
    }],
    "日": [{
      title: "リラックスタイム",
      description: "リラックスした週末の様子",
      emoji: "🌅",
      category: "ライフスタイル"
    }]
  };
  
  return dayNames.map(day => {
    const isPostingDay = postingDays.includes(day);
    
    let posts: Array<{ title: string; description: string; emoji: string; category: string }> = [];
    if (isPostingDay && postTemplates[day]) {
      // 投稿する曜日に応じて内容を決定、dailyPosts数に合わせて調整
      posts = postTemplates[day].slice(0, dailyPosts);
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

