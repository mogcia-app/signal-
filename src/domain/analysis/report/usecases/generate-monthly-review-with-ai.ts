import type { AiClient } from "@/domain/analysis/report/types";
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

const MONTHLY_REVIEW_SYSTEM_PROMPT = (nextMonth: string): string =>
  `あなたはInstagram運用の専門家です。データに基づいて自然で読みやすい日本語で振り返りを提供します。数値だけを羅列するのではなく、具体的な数値とその意味を自然な文章で説明してください。テンプレートのプレースホルダー（{評価}など）をそのまま出力せず、実際のデータに基づいて具体的な内容を書いてください。必ず「📈 ${nextMonth}に向けた提案」セクションを含めてください。このセクションは必須です。提案は必ず「ビジネス情報」と「Instagram AI設定」を参照し、そのビジネスに特化した提案をしてください。**最重要：「重要：提案で必ず使用する具体的な商品・サービス名」セクションに記載されている商品・サービス名を必ず使用してください。これらの具体的なサービス名を提案に含めることで、より実践的で効果的な提案になります。業種に応じた適切な提案をしてください。介護・福祉・老人ホーム業種の場合は、プレゼント企画やセミナー告知ではなく、利用者の日常の様子、家族向けの情報、サービスの紹介（上記の具体的なサービス名を使用）、スタッフの様子、施設の雰囲気、食事の様子、レクリエーション活動など、利用者や家族に寄り添ったコンテンツを提案してください。凡庸な例（「役立つ情報や美しい風景」「プレゼント企画」「セミナー告知」など）は避け、必ず上記の具体的な商品・サービス名を使用して提案をしてください。**「これは、ブランドの認知度を高めるために重要な要素であり」のような硬い表現は避け、もっと自然で読みやすい文章を心がけてください。`;

const PROPOSAL_SYSTEM_PROMPT =
  "あなたはInstagram運用の専門家です。データに基づいて具体的なアクションプランを提供します。必ず「ビジネス情報」と「Instagram AI設定」を参照し、そのビジネスに特化した提案をしてください。**最重要：「重要：提案で必ず使用する具体的な商品・サービス名」セクションに記載されている商品・サービス名を必ず使用してください。これらの具体的なサービス名を提案に含めることで、より実践的で効果的な提案になります。業種に応じた適切な提案をしてください。介護・福祉・老人ホーム業種の場合は、プレゼント企画やセミナー告知ではなく、利用者の日常の様子、家族向けの情報、サービスの紹介（上記の具体的なサービス名を使用）、スタッフの様子、施設の雰囲気、食事の様子、レクリエーション活動など、利用者や家族に寄り添ったコンテンツを提案してください。凡庸な例（「役立つ情報や美しい風景」「プレゼント企画」「セミナー告知」など）は避け、必ず上記の具体的な商品・サービス名を使用して提案をしてください。**";

export async function generateMonthlyReviewWithAi(
  input: GenerateMonthlyReviewWithAiInput
): Promise<string> {
  const model = input.model || "gpt-4o-mini";
  const reviewPrompt = buildMonthlyReviewPrompt(input.monthlyReviewPromptInput);

  let reviewText = await input.aiClient.generateText({
    model,
    systemPrompt: MONTHLY_REVIEW_SYSTEM_PROMPT(input.nextMonth),
    userPrompt: reviewPrompt,
    temperature: 0.7,
    maxTokens: 2000,
  });

  if (!hasProposalSection(reviewText)) {
    try {
      const proposalPrompt = buildProposalPrompt(input.proposalPromptInput);
      const proposalText = await input.aiClient.generateText({
        model,
        systemPrompt: PROPOSAL_SYSTEM_PROMPT,
        userPrompt: proposalPrompt,
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
