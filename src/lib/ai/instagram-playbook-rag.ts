import { promises as fs } from "fs";
import path from "path";

type PostType = "feed" | "reel" | "story";

export interface PlaybookSection {
  id: string;
  title: string;
  content: string;
  score: number;
}

export interface InstagramPlaybookSelection {
  updatedAt: string | null;
  sections: PlaybookSection[];
}

interface ParsedSection {
  title: string;
  content: string;
}

function parseUpdatedAt(markdown: string): string | null {
  const match = markdown.match(/^UpdatedAt:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function parseSections(markdown: string): ParsedSection[] {
  const chunks = markdown.split(/^##\s+/m).map((part) => part.trim()).filter(Boolean);
  const sections: ParsedSection[] = [];
  for (const chunk of chunks) {
    const [titleLine, ...rest] = chunk.split("\n");
    if (!titleLine) {continue;}
    sections.push({
      title: titleLine.trim(),
      content: rest.join("\n").trim(),
    });
  }
  return sections;
}

function normalizeText(text: string): string {
  return text.toLowerCase();
}

function buildKeywordSet(inputPrompt: string, postType: PostType): string[] {
  const prompt = normalizeText(inputPrompt);
  const common = ["保存", "シェア", "エンゲージ", "reach", "retention", "cta", "dm", "ハッシュタグ"];
  const feed = ["feed", "フィード", "保存", "信頼", "比較", "チェックリスト"];
  const reel = ["reel", "リール", "冒頭", "視聴維持", "完了率", "ループ"];
  const story = ["story", "ストーリー", "投票", "質問", "スタンプ", "dm"];

  const postTypeTerms = postType === "feed" ? feed : postType === "reel" ? reel : story;
  const dynamic = prompt
    .split(/[\s、。,.!?！？，：:()\[\]{}]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 20);

  return Array.from(new Set([...common, ...postTypeTerms, ...dynamic]));
}

function scoreSection(section: ParsedSection, keywords: string[], postType: PostType): number {
  const hay = normalizeText(`${section.title}\n${section.content}`);
  let score = 0;

  // Type prior
  if (postType === "feed" && hay.includes("feed")) {score += 6;}
  if (postType === "reel" && hay.includes("reel")) {score += 6;}
  if (postType === "story" && (hay.includes("story") || hay.includes("ストー")) ) {score += 6;}

  // Exact keyword hits
  for (const keyword of keywords) {
    if (!keyword) {continue;}
    if (hay.includes(normalizeText(keyword))) {score += 1;}
  }

  // Prefer operational sections over safety if both matched equally
  if (hay.includes("loop") || hay.includes("retention") || hay.includes("保存") || hay.includes("interaction")) {
    score += 2;
  }
  return score;
}

function toId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function selectInstagramPlaybookSections(input: {
  prompt: string;
  postType: PostType;
  maxSections?: number;
}): Promise<InstagramPlaybookSelection> {
  const maxSections = input.maxSections ?? 3;
  const playbookPath = path.join(process.cwd(), "src/ai/knowledge/instagram-playbook.current.md");
  const markdown = await fs.readFile(playbookPath, "utf-8");
  const updatedAt = parseUpdatedAt(markdown);
  const sections = parseSections(markdown);
  const keywords = buildKeywordSet(input.prompt, input.postType);

  const ranked = sections
    .map((section) => ({
      ...section,
      score: scoreSection(section, keywords, input.postType),
    }))
    .filter((section) => section.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSections)
    .map((section) => ({
      id: toId(section.title),
      title: section.title,
      content: section.content,
      score: section.score,
    }));

  return {
    updatedAt,
    sections: ranked,
  };
}

export function buildPlaybookPromptSnippet(selection: InstagramPlaybookSelection): string {
  if (selection.sections.length === 0) {
    return "";
  }

  const sectionsText = selection.sections
    .map((section, index) => `(${index + 1}) ${section.title}\n${section.content}`)
    .join("\n\n");

  return `【Instagram最新運用プレイブック（抜粋）】
更新日: ${selection.updatedAt || "unknown"}
以下は全文ではなく、今回の投稿テーマに関連するセクションのみを抜粋:

${sectionsText}

【適用ルール】
- 上記プレイブックを優先して投稿の構成・語彙・CTAを調整する
- 明示されていない事項は通常ルールに従う`;
}
