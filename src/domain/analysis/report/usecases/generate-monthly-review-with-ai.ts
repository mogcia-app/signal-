import type { AiClient } from "@/domain/analysis/report/types";
import { getInstagramAlgorithmBrief } from "@/lib/ai/instagram-algorithm-brief";
import {
  buildMonthlyReviewPrompt,
  buildProposalPrompt,
  hasProposalSection,
  type MonthlyReviewPromptInput,
  type ProposalPromptInput,
} from "@/domain/analysis/report/usecases/monthly-review-generation";

interface GenerateMonthlyReviewWithAiInput {
  aiClient: AiClient;
  monthlyReviewPromptInput: MonthlyReviewPromptInput;
  proposalPromptInput: ProposalPromptInput;
  nextMonth: string;
  model?: string;
}

const MONTHLY_REVIEW_SYSTEM_PROMPT = (_nextMonth: string): string =>
  `あなたはInstagram運用の専門家です。データに基づいて、実務で使える月次レポートを作成してください。出力は指定テンプレートの見出し順を厳守し、数字は与えられたデータのみを使用してください。パフォーマンス評価は主要KPI（いいね・コメント・シェア・保存・リポスト・フォロワー増減・エンゲージメント率）を主軸にしてください。特に「コンテンツ別の傾向」ではフィードとリールの比較を必ず含め、提案は2つ固定で各提案に具体的な実行手順（投稿型・本数・訴求テーマ・CTAのうち2要素以上）を含めてください。提案パートではハッシュタグに触れないでください。文体はやわらかく自然で、硬すぎる表現を避けてください。出力本文に丸括弧は使わないでください。提案は必ず「ビジネス情報」と「Instagram AI設定」を参照し、そのビジネスに特化した内容にしてください。`;

const PROPOSAL_SYSTEM_PROMPT =
  "あなたはInstagram運用の専門家です。データに基づいて「来月に向けた提案」を2つ作成します。出力は番号付き2提案のみ。各提案は「タイトル」「説明」「→ 実行手順」で構成し、実行手順には投稿型・本数・訴求テーマ・CTAのうち2要素以上を含めてください。提案パートではハッシュタグに触れないでください。抽象論で終わらせず、投稿制作に直結する具体表現にしてください。";

export async function generateMonthlyReviewWithAi(
  input: GenerateMonthlyReviewWithAiInput
): Promise<string> {
  const model = input.model || "gpt-4o-mini";
  const algorithmBrief = await getInstagramAlgorithmBrief();
  const reviewPrompt = [
    buildMonthlyReviewPrompt(input.monthlyReviewPromptInput),
    "",
    "【最新Instagram運用参照（固定ファイル）】",
    algorithmBrief,
  ].join("\n");

  let reviewText = await input.aiClient.generateText({
    model,
    systemPrompt: `${MONTHLY_REVIEW_SYSTEM_PROMPT(input.nextMonth)}\n\n最新Instagram運用参照（固定ファイル）を必ず反映してください。`,
    userPrompt: reviewPrompt,
    temperature: 0.7,
    maxTokens: 2000,
  });

  if (!hasProposalSection(reviewText)) {
    try {
      const proposalPrompt = buildProposalPrompt(input.proposalPromptInput);
      const proposalText = await input.aiClient.generateText({
        model,
        systemPrompt: `${PROPOSAL_SYSTEM_PROMPT}\n最新Instagram運用参照（固定ファイル）を必ず反映してください。`,
        userPrompt: `${proposalPrompt}\n\n【最新Instagram運用参照（固定ファイル）】\n${algorithmBrief}`,
        temperature: 0.7,
        maxTokens: 800,
      });
      if (proposalText) {
        reviewText += `\n\n⸻\n\n${proposalText}`;
      }
    } catch (error) {
      console.error("提案セクション生成エラー:", error);
    }
  }

  return reviewText;
}
