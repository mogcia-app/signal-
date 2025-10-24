import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, businessInfo } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'プロンプトが必要です' }, { status: 400 });
    }

    // AIプロンプトを構築
    const aiPrompt = buildVideoStructurePrompt(prompt, businessInfo);

    // OpenAI APIを呼び出して動画構成を生成
    const structureResponse = await generateVideoStructureWithAI(aiPrompt);

    return NextResponse.json({
      structure: structureResponse.structure,
      flow: structureResponse.flow
    });

  } catch (error) {
    console.error('動画構成生成エラー:', error);
    return NextResponse.json({ error: '動画構成生成に失敗しました' }, { status: 500 });
  }
}

function buildVideoStructurePrompt(prompt: string, businessInfo: {
  companySize?: string;
  targetMarket?: string[];
  goals?: string[];
  challenges?: string[];
  features?: string[];
  industry?: string;
  businessType?: string;
  tone?: string;
  targetAudience?: string;
} | null) {
  return `
あなたはInstagramリール動画の構成専門家です。以下のプロンプトを基に、リール動画の起承転結と構成の流れを提案してください。

【プロンプト】
${prompt}

【ビジネス情報】
${businessInfo ? JSON.stringify(businessInfo, null, 2) : 'なし'}

【要求事項】
1. リール動画（15-30秒）に適した構成にしてください
2. 起承転結を一言で簡潔に表現してください
3. エンゲージメントを高める構成にしてください
4. 視聴者の注意を引く転換点を含めてください
5. 最後に行動を促す結論にしてください

【出力形式】
以下のJSON形式で回答してください：
{
  "structure": {
    "introduction": "起（導入）の一言",
    "development": "承（展開）の一言", 
    "twist": "転（転換）の一言",
    "conclusion": "結（結論）の一言"
  },
  "flow": "動画全体の構成の流れを簡潔にまとめた説明"
}
`;
}

async function generateVideoStructureWithAI(prompt: string) {
  // OpenAI APIの実装（実際のAPIキーが必要）
  // 現在はモックデータを返す
  const mockStructure = {
    structure: {
      introduction: "商品の魅力を一瞬で伝える",
      development: "使用シーンや効果を具体的に紹介",
      twist: "意外な使い方や隠れた特徴を発見",
      conclusion: "フォローや購入を促すCTA"
    },
    flow: "0-3秒: 商品の全体像を一瞬で見せる → 3-15秒: 実際の使用シーンを複数紹介 → 15-25秒: 意外な使い方や隠れた特徴を発見 → 25-30秒: フォローや購入を促すCTAで締めくくり"
  };

  return mockStructure;
}
