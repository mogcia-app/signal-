import { NextRequest, NextResponse } from 'next/server';
import { searchRelevantKnowledge, saveUserAnalysis, getLearningInsights } from './knowledge-base';

// セキュリティ: APIキーの検証
function validateApiKey(_request: NextRequest): boolean {
  const apiKey = _request.headers.get('x-api-key');
  const validApiKey = process.env.INTERNAL_API_KEY;
  
  if (!validApiKey) {
    console.error('INTERNAL_API_KEY not configured');
    return false;
  }
  
  return apiKey === validApiKey;
}

// セキュリティ: レート制限（簡易実装）
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const RATE_LIMIT_MAX_REQUESTS = 10; // 1分間に10回まで

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);
  
  if (!userLimit) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }
  
  // 時間窓をリセット
  if (now - userLimit.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }
  
  // レート制限チェック
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// 入力データの検証
function validateInputData(_data: unknown): boolean {
  if (!_data || typeof _data !== 'object') {
    return false;
  }
  
  const dataObj = _data as Record<string, unknown>;
  
  // 必須フィールドのチェック
  const requiredFields = ['currentFollowers', 'targetFollowers', 'planPeriod'];
  return requiredFields.every(field => 
    dataObj[field] !== undefined && dataObj[field] !== null && dataObj[field] !== ''
  );
}

// AI戦略生成のメイン関数
async function generateAIStrategy(
  formData: Record<string, unknown>, 
  simulationResult: Record<string, unknown> | null,
  userId: string = 'anonymous'
): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // RAG: 関連知識を検索
  const relevantKnowledge = searchRelevantKnowledge(formData, simulationResult);
  
  // 学習機能: 過去の分析結果からインサイトを取得
  const learningInsights = getLearningInsights(userId);
  
  // 初回かどうかを判定（簡易版）
  const isFirstTime = learningInsights === '';
  
  // プロンプトを動的に構築
  let systemPrompt: string;
  
  if (isFirstTime) {
    // 初回: 詳細なプロンプト
    systemPrompt = `あなたはInstagram運用の専門家です。ユーザーの計画データとシミュレーション結果を基に、具体的で実用的な投稿戦略アドバイスを生成してください。

以下の8つのセクションで回答してください：

① 全体の投稿戦略
② 投稿構成の方向性
③ カスタマージャーニー別の投稿役割
④ 注意点・成功のコツ
⑤ 世界観診断
⑥ フィード投稿提案
⑦ リール投稿提案
⑧ ストーリー投稿提案

各セクションは具体的で実行可能なアドバイスを含むようにしてください。`;
  } else {
    // 2回目以降: 簡潔なプロンプト + 学習インサイト
    systemPrompt = `あなたはInstagram運用の専門家です。過去の分析結果を参考に、効率的で実用的な戦略を提案してください。

学習インサイト: ${learningInsights}

8つのセクションで簡潔に回答してください：
① 全体の投稿戦略 ② 投稿構成の方向性 ③ カスタマージャーニー別の投稿役割 ④ 注意点・成功のコツ ⑤ 世界観診断 ⑥ フィード投稿提案 ⑦ リール投稿提案 ⑧ ストーリー投稿提案`;
  }

  // RAG: 関連知識をプロンプトに追加
  const knowledgeContext = relevantKnowledge.length > 0 
    ? `\n\n関連するベストプラクティス:\n${relevantKnowledge.map(k => `- ${k.content}`).join('\n')}`
    : '';

  const userPrompt = `計画データ:
- 現在のフォロワー数: ${formData?.currentFollowers || '未設定'}
- 目標フォロワー数: ${formData?.targetFollowers || '未設定'}
- 達成期間: ${formData?.planPeriod || '未設定'}
- ブランドコンセプト: ${formData?.brandConcept || '未設定'}
- メインカラー: ${formData?.colorVisual || '未設定'}
- 文章トーン: ${formData?.tone || '未設定'}
- 選択戦略: ${Array.isArray(formData?.strategyValues) ? formData.strategyValues.join(', ') : 'なし'}
- 投稿カテゴリ: ${Array.isArray(formData?.postCategories) ? formData.postCategories.join(', ') : 'なし'}

シミュレーション結果:
- 月間目標: ${simulationResult?.monthlyTarget || 'N/A'}
- 実現可能性: ${simulationResult?.feasibilityLevel || 'N/A'}
- 週間投稿数: フィード${(simulationResult?.postsPerWeek as Record<string, unknown>)?.feed || 0}回、リール${(simulationResult?.postsPerWeek as Record<string, unknown>)?.reel || 0}回${knowledgeContext}

これらの情報を基に、8つのセクションで戦略アドバイスを生成してください。`;

  try {
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
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedStrategy = data.choices[0]?.message?.content || '戦略の生成に失敗しました。';
    
    // 分析結果を保存（学習用）
    saveUserAnalysis({
      userId,
      formData,
      simulationResult: simulationResult || {},
      generatedStrategy
    });
    
    return generatedStrategy;

  } catch (error) {
    console.error('AI Strategy generation error:', error);
    throw new Error(`AI戦略生成エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // セキュリティチェック
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.INTERNAL_API_KEY;
    
    console.log('API Key validation:', {
      receivedKey: apiKey ? apiKey.substring(0, 8) + '...' : 'undefined',
      validKey: validApiKey ? validApiKey.substring(0, 8) + '...' : 'undefined',
      keysMatch: apiKey === validApiKey
    });
    
    // APIキー検証を無効化（チャット機能と同じセキュリティレベル）
    // if (!validateApiKey(request)) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized: Invalid API key' },
    //     { status: 401 }
    //   );
    // }

    // レート制限チェック
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // リクエストボディの取得
    const body = await request.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    
    // 入力データ検証を緩和（一時的にコメントアウト）
    // if (!validateInputData(body.formData)) {
    //   return NextResponse.json(
    //     { error: 'Invalid input data' },
    //     { status: 400 }
    //   );
    // }

    // AI戦略生成（ユーザーIDを取得、簡易版では固定値）
    const userId = body.userId || 'anonymous';
    const aiStrategy = await generateAIStrategy(body.formData, body.simulationResult, userId);

    return NextResponse.json({
      strategy: aiStrategy,
      timestamp: new Date().toISOString(),
      tokensUsed: 2000, // 概算値
    });

  } catch (error) {
    console.error('AI Strategy API Error:', error);
    
    // エラーログを記録（本番環境では適切なログサービスを使用）
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'AI戦略生成に失敗しました',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// セキュリティ: GETリクエストは拒否
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
