/**
 * Domain層: AIクライアント
 * OpenAI API呼び出し
 */

/**
 * OpenAI APIを呼び出す
 */
export async function callOpenAI(prompt: string, context?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not found");
  }

  const messages = [
    {
      role: "system",
      content: `あなたはInstagram分析の専門AIアシスタントです。ユーザーのInstagram運用データを分析し、具体的で実用的なアドバイスを提供します。

分析のポイント：
- データに基づいた客観的な分析
- 具体的で実行可能な改善提案
- ユーザーの成長段階に応じたアドバイス
- 簡潔で分かりやすい説明

${context ? `\nマスターコンテキスト:\n${context}` : ""}`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "分析結果を取得できませんでした。";
}

