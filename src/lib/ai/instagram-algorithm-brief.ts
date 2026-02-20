import { readFile } from "fs/promises";
import path from "path";

const BRIEF_PATH = path.join(process.cwd(), "docs", "ai", "instagram-algorithm-brief.md");
const MAX_BRIEF_CHARS = 6000;

let cachedValue = "";
let cachedAtMs = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_BRIEF = [
  "## Instagram運用アップデート要点（フォールバック）",
  "- 反応（コメント・シェア・保存）を起点に拡散が伸びる設計を優先する。",
  "- リール偏重にせず、ストーリーズで接触頻度と関係性を積み上げる。",
  "- ハッシュタグは量より適合度を重視し、5個以内で運用する。",
  "- 施策は毎月のKPI実績に紐づけ、実行回数と判定基準を明示する。",
].join("\n");

export async function getInstagramAlgorithmBrief(): Promise<string> {
  const now = Date.now();
  if (cachedValue && now - cachedAtMs < CACHE_TTL_MS) {
    return cachedValue;
  }

  try {
    const raw = await readFile(BRIEF_PATH, "utf-8");
    const normalized = String(raw || "").trim();
    if (!normalized) {
      cachedValue = DEFAULT_BRIEF;
      cachedAtMs = now;
      return cachedValue;
    }

    cachedValue = normalized.slice(0, MAX_BRIEF_CHARS);
    cachedAtMs = now;
    return cachedValue;
  } catch (error) {
    console.warn("instagram algorithm brief read failed:", error);
    cachedValue = DEFAULT_BRIEF;
    cachedAtMs = now;
    return cachedValue;
  }
}

