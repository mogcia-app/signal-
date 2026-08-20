const LEARNING_PHASE_LABELS: Record<string, string> = {
  initial: "初期セットアップ",
  learning: "学習中",
  optimized: "最適化フェーズ",
  master: "マスターモード",
};

export const LEARNING_PHASE_THRESHOLDS = {
  learning: 50,
  optimized: 125,
  master: 250,
} as const;

export type LearningPhase = "initial" | "learning" | "optimized" | "master";

export function getLearningPhaseLabel(phase?: string | null): string {
  if (!phase) {
    return "未設定";
  }
  return LEARNING_PHASE_LABELS[phase] ?? phase;
}

export function getLearningPhaseByInteractions(totalInteractions: number): LearningPhase {
  if (totalInteractions >= LEARNING_PHASE_THRESHOLDS.master) {
    return "master";
  }
  if (totalInteractions >= LEARNING_PHASE_THRESHOLDS.optimized) {
    return "optimized";
  }
  if (totalInteractions >= LEARNING_PHASE_THRESHOLDS.learning) {
    return "learning";
  }
  return "initial";
}

export function getLearningPhaseProgress(totalInteractions: number): number {
  const total = Math.max(0, totalInteractions);
  const { learning, optimized, master } = LEARNING_PHASE_THRESHOLDS;

  if (total >= master) {
    return 100;
  }
  if (total >= optimized) {
    return 50 + ((total - optimized) / (master - optimized)) * 50;
  }
  if (total >= learning) {
    return 25 + ((total - learning) / (optimized - learning)) * 25;
  }
  return (total / learning) * 25;
}
