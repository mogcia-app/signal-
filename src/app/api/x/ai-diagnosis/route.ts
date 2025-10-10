import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildPlanPrompt } from '../../../../utils/aiPromptBuilder';
import { adminAuth, adminDb } from '../../../../lib/firebase-admin';
import { UserProfile } from '../../../../types/user';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

interface XAIDiagnosisRequest {
  planData: {
    goalName: string;
    planPeriod: string;
    currentFollowers: number;
    targetFollowers: number;
    goalCategory: string;
    targetAudience: string;
    strategies: string[];
    postCategories: string[];
    tweetFreq: number;
    threadFreq: number;
    replyFreq: number;
    retweetGoal: number;
    replyGoal: number;
    reachGoal: number;
    aiHelpRequest: string;
    pastLearnings: string;
    referenceAccounts: string;
    hashtagStrategy: string;
    constraints: string;
    freeMemo: string;
  };
  simulationResult?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI APIキーが設定されていません' },
        { status: 500 }
      );
    }

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

    const body: XAIDiagnosisRequest = await request.json();
    const { planData } = body;

    // ユーザープロファイルを取得
    let userProfile: UserProfile | null = null;
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userProfile = userDoc.data() as UserProfile;
      }
    } catch (error) {
      console.warn('ユーザープロファイル取得エラー（デフォルト値を使用）:', error);
    }

    // プロンプトビルダーを使用してシステムプロンプトを構築
    let systemPrompt: string;
    
    if (userProfile) {
      // ✅ プロンプトビルダーを使用（クライアントの詳細情報を含む）
      systemPrompt = buildPlanPrompt(
        userProfile,
        'x',
        {
          currentFollowers: planData.currentFollowers,
          targetFollowers: planData.targetFollowers,
          planPeriod: planData.planPeriod,
          goalCategory: planData.goalCategory,
          strategyValues: planData.strategies,
          postCategories: planData.postCategories,
          brandConcept: planData.referenceAccounts,
          tone: planData.hashtagStrategy,
        },
        body.simulationResult as {
          monthlyTarget?: number | string;
          feasibilityLevel?: string;
          postsPerWeek?: { feed?: number; reel?: number };
        }
      );
      
      // X版特化の追加指示
      systemPrompt += `

## X版特化の指示
X（旧Twitter）の特性を活かした戦略を提案してください：
- 短いメッセージ（ツイート）での即座の情報発信
- スレッドでの深い洞察やストーリー展開
- リプライでの積極的なコミュニティ参加
- リアルタイム性とトレンド性の重視
- エンゲージメント（リツイート、リプライ、いいね）の重要性

## 投稿頻度
- ツイート: ${planData.tweetFreq}回/週
- スレッド: ${planData.threadFreq}回/週
- リプライ: ${planData.replyFreq}回/週

## 目標数値
- リツイート: ${planData.retweetGoal}回
- リプライ: ${planData.replyGoal}回
- リーチ: ${planData.reachGoal}人

## 回答形式
以下の形式でX版特化の戦略アドバイスを提供してください:

## 全体戦略
[X版での効果的な運用戦略を3-4文で説明]

## 投稿構成
### ツイート戦略
- [日常の気づきや短いメッセージの戦略]
- [トレンドハッシュタグの活用方法]
- [エンゲージメントを促進する投稿パターン]

### スレッド戦略
- [深い洞察やストーリー展開の方法]
- [段階的な情報提供のテクニック]
- [読者の興味を引く構成のコツ]

### リプライ戦略
- [フォロワーとの積極的な交流方法]
- [感謝の気持ちを表現するテクニック]
- [建設的な議論を促進する方法]

## カスタマージャーニー
[X版でのフォロワー獲得から継続エンゲージメントまでの流れ]

## 成功のコツ
- [X版特有の成功要因を5-6項目でリスト化]

## ブランド世界観
- コンセプト: [X版に適したブランドコンセプト]
- メインカラー: [ブランドカラー]
- サブカラー: [サブカラー]
- トーン: [X版に適したトーン]

## 推奨投稿内容

### ツイート
- [具体的なツイート内容の例を3-4項目]

### スレッド
- [具体的なスレッド内容の例を2-3項目]

### リプライ
- [具体的なリプライ内容の例を2-3項目]`;
    } else {
      // フォールバック: ユーザープロファイルがない場合（旧ロジック）
      systemPrompt = `あなたはX（旧Twitter）の運用戦略を専門とするAIアシスタントです。ユーザーの運用計画に基づいて、X版に特化した戦略アドバイスを提供してください。

X版の特性:
- 短いメッセージ（ツイート）での即座の情報発信
- スレッドでの深い洞察やストーリー展開
- リプライでの積極的なコミュニティ参加
- リアルタイム性とトレンド性の重視
- エンゲージメント（リツイート、リプライ、いいね）の重要性

ユーザーの計画:
- 計画名: ${planData.goalName}
- 期間: ${planData.planPeriod}
- 現在のフォロワー数: ${planData.currentFollowers}人
- 目標フォロワー数: ${planData.targetFollowers}人
- KPIカテゴリ: ${planData.goalCategory}
- ターゲット層: ${planData.targetAudience}
- 選択された施策: ${planData.strategies.join(', ')}
- 投稿カテゴリ: ${planData.postCategories.join(', ')}
- 投稿頻度: ツイート${planData.tweetFreq}回/週、スレッド${planData.threadFreq}回/週、リプライ${planData.replyFreq}回/週
- 目標数値: リツイート${planData.retweetGoal}回、リプライ${planData.replyGoal}回、リーチ${planData.reachGoal}人
- AI相談内容: ${planData.aiHelpRequest}
- 過去の学び: ${planData.pastLearnings}
- 参考アカウント: ${planData.referenceAccounts}
- ハッシュタグ戦略: ${planData.hashtagStrategy}
- 制約条件: ${planData.constraints}

以下の形式でX版特化の戦略アドバイスを提供してください:

## 全体戦略
[X版での効果的な運用戦略を3-4文で説明]

## 投稿構成
### ツイート戦略
- [日常の気づきや短いメッセージの戦略]
- [トレンドハッシュタグの活用方法]
- [エンゲージメントを促進する投稿パターン]

### スレッド戦略
- [深い洞察やストーリー展開の方法]
- [段階的な情報提供のテクニック]
- [読者の興味を引く構成のコツ]

### リプライ戦略
- [フォロワーとの積極的な交流方法]
- [感謝の気持ちを表現するテクニック]
- [建設的な議論を促進する方法]

## カスタマージャーニー
[X版でのフォロワー獲得から継続エンゲージメントまでの流れ]

## 成功のコツ
- [X版特有の成功要因を5-6項目でリスト化]

## ブランド世界観
- コンセプト: [X版に適したブランドコンセプト]
- メインカラー: [ブランドカラー]
- サブカラー: [サブカラー]
- トーン: [X版に適したトーン]

## 推奨投稿内容

### ツイート
- [具体的なツイート内容の例を3-4項目]

### スレッド
- [具体的なスレッド内容の例を2-3項目]

### リプライ
- [具体的なリプライ内容の例を2-3項目]

X版の特性を活かした、実践的で具体的なアドバイスを提供してください。`;
    }

    const userPrompt = userProfile 
      ? `上記のクライアント情報と計画データを基に、X版特化の戦略を提案してください。`
      : `X版の運用戦略を教えてください。`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    
    // ✅ 運用計画をFirestoreに保存（PDCAのP - Plan）
    try {
      await adminDb.collection('plans').add({
        userId,
        snsType: 'x',
        planType: 'ai_generated',
        formData: planData,
        simulationResult: body.simulationResult || {},
        generatedStrategy: aiResponse,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      });
      console.log('✅ X運用計画をFirestoreに保存しました');
    } catch (saveError) {
      console.error('⚠️ 運用計画の保存エラー:', saveError);
    }

    // レスポンスを解析して構造化
    const sections = aiResponse.split('## ').slice(1);
    const result = {
      overallStrategy: sections.find(s => s.startsWith('全体戦略'))?.replace('全体戦略\n', '').trim() || '',
      postComposition: sections.find(s => s.startsWith('投稿構成'))?.replace('投稿構成\n', '').trim() || '',
      customerJourney: sections.find(s => s.startsWith('カスタマージャーニー'))?.replace('カスタマージャーニー\n', '').trim() || '',
      successTips: sections.find(s => s.startsWith('成功のコツ'))?.replace('成功のコツ\n', '').trim() || '',
      brandWorldview: {
        concept: sections.find(s => s.startsWith('ブランド世界観'))?.match(/コンセプト: (.+)/)?.[1] || '',
        mainColor: sections.find(s => s.startsWith('ブランド世界観'))?.match(/メインカラー: (.+)/)?.[1] || '',
        subColor: sections.find(s => s.startsWith('ブランド世界観'))?.match(/サブカラー: (.+)/)?.[1] || '',
        tone: sections.find(s => s.startsWith('ブランド世界観'))?.match(/トーン: (.+)/)?.[1] || ''
      },
      feedRecommendations: sections.find(s => s.startsWith('推奨投稿内容'))?.match(/### ツイート\n([\s\S]*?)(?=###|$)/)?.[1]?.split('- ').slice(1).map(item => item.trim()) || [],
      reelRecommendations: sections.find(s => s.startsWith('推奨投稿内容'))?.match(/### スレッド\n([\s\S]*?)(?=###|$)/)?.[1]?.split('- ').slice(1).map(item => item.trim()) || [],
      storyRecommendations: sections.find(s => s.startsWith('推奨投稿内容'))?.match(/### リプライ\n([\s\S]*?)(?=###|$)/)?.[1]?.split('- ').slice(1).map(item => item.trim()) || []
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('X版AI診断エラー:', error);
    return NextResponse.json(
      { error: 'AI診断の実行に失敗しました' },
      { status: 500 }
    );
  }
}
