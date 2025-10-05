import { NextResponse } from 'next/server';

// AI学習機能は一時的に無効化
export async function GET() {
  return NextResponse.json({ 
    error: 'AI学習機能は一時的に無効化されています',
    message: '他の機能を先に完成させてから実装予定です'
  }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({ 
    error: 'AI学習機能は一時的に無効化されています',
    message: '他の機能を先に完成させてから実装予定です'
  }, { status: 503 });
}

/* AI学習機能（一時的にコメントアウト）
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

// SNS運用以外の質問を検出するキーワード
const nonSNSKeywords = [
  'こんにちは', 'hello', 'hi', 'hey', '天気', 'テスト', 'test',
  'ありがとう', 'thank you', 'おはよう', 'こんばんは', 'good morning', 'good evening',
  '雑談', 'chat', '暇', '退屈', '何してる', 'what are you doing',
  '今日は', '今日の', '今日の天気', '明日', '昨日',
  '調子は', '元気', 'お疲れ', '頑張って', '応援',
  'ランダム', 'random', '面白い', 'funny', 'ジョーク', 'joke',
  '時間', '何時', 'what time', '日付', 'date',
  '名前', 'name', '誰', 'who', '何', 'what', 'どこ', 'where',
  'なぜ', 'why', 'どうして', 'how', 'どのように',
  'はい', 'いいえ', 'yes', 'no', 'maybe', 'perhaps',
  'すみません', 'sorry', 'excuse me', 'pardon',
  'おめでとう', 'congratulations', 'お誕生日', 'birthday',
  'クリスマス', 'christmas', '新年', 'new year',
  'おやすみ', 'good night', 'さようなら', 'goodbye', 'bye'
];

// テンプレート返答
const templateResponses = [
  'Instagram運用について何かお困りですか？',
  'SNS運用のご相談がございましたらお気軽にどうぞ！',
  'Instagram戦略について質問があればお答えします！',
  'SNS運用でお悩みのことがあれば教えてください！',
  'Instagram運用でお手伝いできることがあればどうぞ！',
  'SNS戦略について何でもご相談ください！',
  'Instagram運用のコツについて聞きたいことがあればどうぞ！',
  'SNS運用で困っていることがあれば教えてください！'
];

// メッセージがSNS運用以外の内容かチェック
function isNonSNSQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  // 空文字または短すぎるメッセージ
  if (lowerMessage.length <= 2) return true;
  
  // キーワードチェック
  return nonSNSKeywords.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
}

// ランダムなテンプレート返答を取得
function getRandomTemplateResponse(): string {
  return templateResponses[Math.floor(Math.random() * templateResponses.length)];
}

// チャットログを取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'logs') {
      // チャットログを取得
      const logsQuery = query(
        collection(db, 'chatLogs'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const logsSnapshot = await getDocs(logsQuery);
      const logs = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      return NextResponse.json({
        success: true,
        logs
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Chat Logs API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat logs', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, userId, pageType } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // SNS運用以外の質問の場合はテンプレート返答
    if (isNonSNSQuestion(message)) {
      console.log('Non-SNS question detected, using template response:', message);
      const templateResponse = getRandomTemplateResponse();
      
      // ログを保存
      if (userId && pageType) {
        try {
          await addDoc(collection(db, 'chatLogs'), {
            userId,
            pageType,
            message,
            response: templateResponse,
            timestamp: new Date(),
            contextData: context,
            isTemplateResponse: true,
            tokensUsed: 0
          });
        } catch (logError) {
          console.error('Failed to save chat log:', logError);
        }
      }
      
      return NextResponse.json({
        response: templateResponse,
        isTemplateResponse: true,
        tokensUsed: 0,
        timestamp: new Date().toISOString()
      });
    }

    // OpenAI API を直接呼び出し
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OpenAI API key not found');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // プロンプトを構築
    const systemPrompt = `あなたはInstagram運用の専門家です。ユーザーの計画内容とシミュレーション結果を基に、具体的で実用的なアドバイスを提供してください。

現在の計画内容:
${context ? JSON.stringify(context, null, 2) : '計画情報なし'}

ユーザーの質問に日本語で回答してください。専門的でありながら分かりやすく、実行可能な提案を心がけてください。`;

    console.log('AI Chat request:', { message, hasContext: !!context });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'OpenAI API call failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '申し訳ございません。回答を生成できませんでした。';

    console.log('AI Chat response generated:', { 
      responseLength: aiResponse.length,
      tokensUsed: data.usage?.total_tokens 
    });

    // ログを保存
    if (userId && pageType) {
      try {
        await addDoc(collection(db, 'chatLogs'), {
          userId,
          pageType,
          message,
          response: aiResponse,
          timestamp: new Date(),
          contextData: context,
          isTemplateResponse: false,
          tokensUsed: data.usage?.total_tokens || 0
        });
      } catch (logError) {
        console.error('Failed to save chat log:', logError);
      }
    }

    return NextResponse.json({
      response: aiResponse,
      isTemplateResponse: false,
      tokensUsed: data.usage?.total_tokens,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: 'AI Chat processing failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
*/
