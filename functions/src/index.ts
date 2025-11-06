import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY,
});

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest({ cors: true }, (request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

// HTTPSトリガーの例
export const api = onRequest({ cors: true }, (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(204).send("");
    return;
  }

  switch (req.method) {
    case "GET":
      res.json({ message: "GET request received", timestamp: new Date().toISOString() });
      break;
    case "POST":
      res.json({
        message: "POST request received",
        data: req.body,
        timestamp: new Date().toISOString(),
      });
      break;
    default:
      res.status(405).json({ error: "Method not allowed" });
  }
});

// AI Chat Function
export const aiChat = onRequest({ cors: true }, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { message, context } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // プロンプトを構築
    const systemPrompt = `あなたはInstagram運用の専門家です。ユーザーの計画内容とシミュレーション結果を基に、具体的で実用的なアドバイスを提供してください。

現在の計画内容:
${context ? JSON.stringify(context, null, 2) : "計画情報なし"}

ユーザーの質問に日本語で回答してください。専門的でありながら分かりやすく、実行可能な提案を心がけてください。`;

    logger.info("AI Chat request", { message, hasContext: !!context });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response =
      completion.choices[0]?.message?.content || "申し訳ございません。回答を生成できませんでした。";

    logger.info("AI Chat response generated", {
      responseLength: response.length,
      tokensUsed: completion.usage?.total_tokens,
    });

    res.json({
      response,
      tokensUsed: completion.usage?.total_tokens,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("AI Chat error", { error: error.message });
    res.status(500).json({
      error: "AI Chat processing failed",
      details: error.message,
    });
  }
});
