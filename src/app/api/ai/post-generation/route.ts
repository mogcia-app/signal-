import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildPostGenerationPrompt } from '../../../../utils/aiPromptBuilder';
import { adminAuth, adminDb } from '../../../../lib/firebase-admin';
import { UserProfile } from '../../../../types/user';

// OpenAI APIの初期化
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

interface PostGenerationRequest {
  prompt: string;
  postType: 'feed' | 'reel' | 'story';
  planData: {
    title: string;
    targetFollowers: number;
    currentFollowers: number;
    planPeriod: string;
    targetAudience: string;
    category: string;
    strategies: string[];
    aiPersona: {
      tone: string;
      style: string;
      personality: string;
      interests: string[];
    };
    simulation: {
      postTypes: {
        reel: { weeklyCount: number; followerEffect: number };
        feed: { weeklyCount: number; followerEffect: number };
        story: { weeklyCount: number; followerEffect: number };
      };
    };
  };
  scheduledDate?: string;
  scheduledTime?: string;
  action?: 'suggestTime' | 'generatePost';
}

export async function POST(request: NextRequest) {
  try {
    // 🔐 Firebase認証トークンからユーザーIDを取得
    let userId = 'anonymous';
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;
        console.log('✅ Authenticated user:', userId);
      } catch (authError) {
        console.warn('⚠️ Firebase認証エラー（匿名ユーザーとして処理）:', authError);
      }
    }

    const body: PostGenerationRequest = await request.json();
    const { prompt, postType, planData, scheduledDate, scheduledTime, action = 'generatePost' } = body;

    // ✅ ユーザープロファイルを取得
    let userProfile: UserProfile | null = null;
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userProfile = userDoc.data() as UserProfile;
        console.log('✅ ユーザープロファイル取得成功');
      }
    } catch (error) {
      console.warn('⚠️ ユーザープロファイル取得エラー:', error);
    }

    // ✅ 最新の運用計画を取得（PDCA - Plan）
    let latestPlan: Record<string, unknown> | null = null;
    try {
      const plansSnapshot = await adminDb
        .collection('plans')
        .where('userId', '==', userId)
        .where('snsType', '==', 'instagram')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!plansSnapshot.empty) {
        latestPlan = plansSnapshot.docs[0].data();
        console.log('✅ 運用計画取得成功:', latestPlan.planType);
      }
    } catch (error) {
      console.warn('⚠️ 運用計画取得エラー:', error);
    }

    // 時間提案の場合
    if (action === 'suggestTime') {
      try {
        // 過去の分析データを取得してエンゲージメントが高かった時間帯を分析
        const analyticsSnapshot = await adminDb
          .collection('analytics')
          .where('userId', '==', userId)
          .limit(50)
          .get();

        if (!analyticsSnapshot.empty) {
          // 時間帯別のエンゲージメント率を計算
          const timeSlotEngagement: Record<string, { totalEngagement: number; count: number }> = {};
          
          analyticsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const publishedTime = data.publishedTime;
            
            if (publishedTime && data.reach > 0) {
              const hour = publishedTime.split(':')[0];
              const engagement = ((data.likes || 0) + (data.comments || 0) + (data.shares || 0)) / data.reach * 100;
              
              if (!timeSlotEngagement[hour]) {
                timeSlotEngagement[hour] = { totalEngagement: 0, count: 0 };
              }
              
              timeSlotEngagement[hour].totalEngagement += engagement;
              timeSlotEngagement[hour].count += 1;
            }
          });

          // 平均エンゲージメント率が最も高い時間帯を取得
          let bestHour = '';
          let bestEngagement = 0;
          
          Object.entries(timeSlotEngagement).forEach(([hour, data]) => {
            const avgEngagement = data.totalEngagement / data.count;
            if (avgEngagement > bestEngagement) {
              bestEngagement = avgEngagement;
              bestHour = hour;
            }
          });

          if (bestHour) {
            const suggestedTime = `${bestHour}:00`;
            return NextResponse.json({
              success: true,
              data: {
                suggestedTime,
                postType,
                reason: `過去のデータ分析により、${bestHour}時台のエンゲージメント率が最も高いです（平均${bestEngagement.toFixed(2)}%）`,
                basedOnData: true
              }
            });
          }
        }
      } catch (error) {
        console.error('データ分析エラー:', error);
        // エラー時はデフォルトロジックにフォールバック
      }

      // デフォルトの最適時間（初回または分析データがない場合）
      const optimalTimes = {
        feed: ['09:00', '12:00', '18:00', '20:00'],
        reel: ['07:00', '12:00', '19:00', '21:00'],
        story: ['08:00', '13:00', '18:00', '22:00']
      };
      
      const times = optimalTimes[postType];
      const suggestedTime = times[Math.floor(Math.random() * times.length)];
      
      return NextResponse.json({
        success: true,
        data: {
          suggestedTime,
          postType,
          reason: `${postType === 'feed' ? 'フィード' : postType === 'reel' ? 'リール' : 'ストーリーズ'}の一般的な最適時間です`,
          basedOnData: false
        }
      });
    }

    // 投稿文生成の場合
    if (!prompt.trim()) {
      return NextResponse.json(
        { error: '投稿のテーマを入力してください' },
        { status: 400 }
      );
    }

    // OpenAI APIキーのチェック
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // ✅ プロンプトビルダーを使用（PDCA - Do）
    let systemPrompt: string;
    
    if (userProfile) {
      // ✅ ユーザープロファイル + 運用計画を参照
      systemPrompt = buildPostGenerationPrompt(userProfile, 'instagram', postType);
      
      // 運用計画の要約を追加
      if (latestPlan) {
        const createdAt = latestPlan.createdAt as { toDate?: () => Date };
        const createdDate = createdAt?.toDate?.()?.toLocaleDateString?.() || '不明';
        const planType = (latestPlan.planType as string) || 'AI生成';
        const strategy = (latestPlan.generatedStrategy as string) || '運用計画を参照してください';
        
        systemPrompt += `

【運用計画の参照（PDCA - Plan）】
この投稿は、以下の運用計画に基づいて生成されます：
- 計画タイプ: ${planType}
- 作成日: ${createdDate}
- 戦略の概要: ${strategy.substring(0, 200)}...

運用計画との一貫性を保ちながら、投稿を生成してください。`;
      }

      // 投稿タイプ別の追加指示
      systemPrompt += `

【投稿生成の指示】
- 投稿タイプ: ${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'フィード'}
- 投稿日時: ${scheduledDate ? `${scheduledDate} ${scheduledTime}` : '未設定'}
- テーマ: ${prompt}

以下の形式で返してください:
- タイトル: 簡潔で魅力的なタイトル
- 本文: 計画に沿った投稿文（200-400文字程度）
- ハッシュタグ: 関連するハッシュタグの配列（5-10個）`;
    } else {
      // フォールバック: planData を使用（旧ロジック）
      if (!planData) {
        return NextResponse.json(
          { error: '運用計画データが必要です' },
          { status: 400 }
        );
      }

      const strategy = planData.strategies[Math.floor(Math.random() * planData.strategies.length)];
      const targetGrowth = Math.round((planData.targetFollowers - planData.currentFollowers) / planData.targetFollowers * 100);
      const weeklyTarget = planData.simulation.postTypes[postType].weeklyCount;
      const followerEffect = planData.simulation.postTypes[postType].followerEffect;

      systemPrompt = `あなたはInstagramの運用をサポートするAIアシスタントです。ユーザーの運用計画に基づいて、効果的な投稿文を生成してください。

運用計画の詳細:
- 計画名: ${planData.title}
- 目標フォロワー: ${planData.targetFollowers.toLocaleString()}人
- 現在のフォロワー: ${planData.currentFollowers.toLocaleString()}人
- 達成率: ${targetGrowth}%
- 計画期間: ${planData.planPeriod}
- ターゲットオーディエンス: ${planData.targetAudience}
- カテゴリ: ${planData.category}
- 戦略: ${planData.strategies.join(', ')}

AIペルソナ:
- トーン: ${planData.aiPersona.tone}
- スタイル: ${planData.aiPersona.style}
- パーソナリティ: ${planData.aiPersona.personality}
- 興味: ${planData.aiPersona.interests.join(', ')}

投稿設定:
- 投稿タイプ: ${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'フィード'}
- 週間投稿数: ${weeklyTarget}回
- 期待効果: +${followerEffect}人/投稿
- 投稿日時: ${scheduledDate ? `${scheduledDate} ${scheduledTime}` : '未設定'}

生成する投稿文の要件:
1. 運用計画の戦略（${strategy}）を意識した内容
2. AIペルソナに沿った${planData.aiPersona.tone}で${planData.aiPersona.style}なスタイル
3. ${planData.targetAudience}との繋がりを深める内容
4. 目標達成への意識を適度に含める
5. エンゲージメントを促進する要素を含める
6. 適切なハッシュタグ（5-10個）を含める

投稿文は以下の形式で返してください:
- タイトル: 簡潔で魅力的なタイトル
- 本文: 計画に沿った投稿文（200-400文字程度）
- ハッシュタグ: 関連するハッシュタグの配列`;
    }

    const userPrompt = `以下のテーマで${postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'フィード'}投稿文を生成してください:

テーマ: ${prompt}

${userProfile ? '上記のクライアント情報と運用計画に基づいて、効果的な投稿文を作成してください。' : '上記の運用計画とAIペルソナに基づいて、効果的な投稿文を作成してください。'}`;

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = chatCompletion.choices[0].message.content;

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'AI投稿文の生成に失敗しました' },
        { status: 500 }
      );
    }

    // AIレスポンスを解析してタイトル、本文、ハッシュタグを抽出
    const lines = aiResponse.split('\n').filter(line => line.trim());
    
    let title = '';
    let content = '';
    let hashtags: string[] = [];

    let currentSection = '';
    for (const line of lines) {
      if (line.includes('タイトル:') || line.includes('タイトル：')) {
        title = line.replace(/タイトル[:：]\s*/, '').trim();
        currentSection = 'title';
      } else if (line.includes('本文:') || line.includes('本文：')) {
        currentSection = 'content';
        content = line.replace(/本文[:：]\s*/, '').trim();
      } else if (line.includes('ハッシュタグ:') || line.includes('ハッシュタグ：')) {
        currentSection = 'hashtags';
        const hashtagText = line.replace(/ハッシュタグ[:：]\s*/, '').trim();
        hashtags = hashtagText.split(/[,\s]+/).filter(tag => tag.trim());
      } else if (currentSection === 'content' && line.trim()) {
        content += '\n' + line.trim();
      } else if (currentSection === 'hashtags' && line.trim()) {
        const additionalHashtags = line.split(/[,\s]+/).filter(tag => tag.trim());
        hashtags.push(...additionalHashtags);
      }
    }

    // フォールバック: パースに失敗した場合の処理
    if (!title || !content) {
      title = `${prompt}${userProfile ? ` - ${userProfile.name}` : ''}`;
      content = aiResponse;
      hashtags = [
        postType === 'reel' ? 'リール' : postType === 'story' ? 'ストーリーズ' : 'インスタグラム',
        '成長',
        prompt.replace(/\s+/g, ''),
        'エンゲージメント',
        'フォロワー',
        '目標達成'
      ];
    }

    // ハッシュタグに#を追加（まだない場合）
    hashtags = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`);

    return NextResponse.json({
      success: true,
      data: {
        title,
        content,
        hashtags,
        metadata: {
          postType,
          generatedAt: new Date().toISOString(),
          basedOnPlan: latestPlan ? true : false,
          ...(userProfile && { clientName: userProfile.name }),
          ...(latestPlan && { planType: (latestPlan.planType as string) })
        }
      }
    });

  } catch (error) {
    console.error('AI投稿文生成エラー:', error);
    return NextResponse.json(
      { 
        error: 'AI投稿文の生成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
