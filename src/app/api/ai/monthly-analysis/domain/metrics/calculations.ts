/**
 * Domain層: 各種メトリクス計算
 * 副作用なしの数値計算関数
 */

import type { PostLearningSignal } from "../../types";

/**
 * トップハッシュタグを集計
 */
export function collectTopHashtags(signals: PostLearningSignal[]): Record<string, number> {
  const counts: Record<string, number> = {};

  signals.forEach((signal) => {
    const weight =
      signal.tag === "gold" ? 2 : signal.tag === "gray" ? 1 : signal.tag === "red" ? 0.5 : 0.3;
    signal.hashtags.forEach((tag) => {
      const normalized = tag.toLowerCase();
      if (!normalized) {
        return;
      }
      counts[normalized] = (counts[normalized] || 0) + weight;
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .reduce((acc, [tag, value]) => {
      acc[tag] = Number(value.toFixed(2));
      return acc;
    }, {} as Record<string, number>);
}

