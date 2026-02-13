import OpenAI from "openai";
import type { AiClient } from "@/domain/analysis/report/types";

export function createReportAiClient(apiKey: string | undefined): AiClient | null {
  if (!apiKey) {
    return null;
  }

  const openai = new OpenAI({ apiKey });

  return {
    async generateText({ model, systemPrompt, userPrompt, temperature, maxTokens }) {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      });
      return completion.choices[0]?.message?.content || "";
    },
  };
}
