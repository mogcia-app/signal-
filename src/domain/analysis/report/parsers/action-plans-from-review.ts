import type { ParsedActionPlan } from "@/domain/analysis/report/types";

export function extractActionPlansFromReview(reviewText: string, nextMonth: string): ParsedActionPlan[] {
  const actionPlans: ParsedActionPlan[] = [];

  if (!reviewText || !nextMonth) {
    return actionPlans;
  }

  const escapedMonth = nextMonth.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    /3\.\s*次の一手(?:（優先順3つ）)?[\s\S]*?(?=\n\s*4\.|\n\s*###\s*4\.|⸻|$)/i,
    /###\s*3\.\s*次の一手(?:（優先順3つ）)?[\s\S]*?(?=\n\s*###\s*4\.|⸻|$)/i,
    /4\.\s*次の一手(?:（優先順3つ）)?[\s\S]*?(?=\n\s*5\.|\n\s*###\s*5\.|⸻|$)/i,
    /###\s*4\.\s*次の一手(?:（優先順3つ）)?[\s\S]*?(?=\n\s*###\s*5\.|⸻|$)/i,
    new RegExp(`📈\\s*${escapedMonth}に向けた提案[\\s\\S]*?(?=⸻|$)`, "i"),
    /📈\s*[^\n]*向けた提案[\s\S]*?(?=⸻|$)/i,
    /📈[\s\S]*?提案[\s\S]*?(?=⸻|$)/i,
  ];

  let proposalText = "";
  for (const pattern of patterns) {
    const match = reviewText.match(pattern);
    if (match) {
      proposalText = match[0];
      break;
    }
  }

  if (!proposalText) {
    return actionPlans;
  }

  const proposalRegex = /(\d+)\.\s*(?:\[[A-C]\]\s*)?([^\n]+)(?:\n\s*([^\n]+(?:\n\s*[^\n]+)*?))?(?=\n\s*\d+\.|$)/g;
  let proposalMatch;

  while ((proposalMatch = proposalRegex.exec(proposalText)) !== null) {
    const title = proposalMatch[2]?.trim() || "";
    const descriptionAndAction = (proposalMatch[3] || "").trim();

    if (!title) {
      continue;
    }

    const lines = descriptionAndAction
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line);
    let description = "";
    let action = "";

    for (const line of lines) {
      if (line.match(/^[→→]\s*/)) {
        action = line.replace(/^[→→]\s*/, "").trim();
      } else {
        description += (description ? " " : "") + line;
      }
    }

    actionPlans.push({
      title,
      description: description.trim(),
      action: action.trim(),
    });
  }

  return actionPlans;
}
