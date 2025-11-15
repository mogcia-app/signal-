const LEARNING_PHASE_LABELS: Record<string, string> = {
  initial: "初期セットアップ",
  learning: "学習中",
  optimized: "最適化フェーズ",
  master: "マスターモード",
};

export function getLearningPhaseLabel(phase?: string | null): string {
  if (!phase) {
    return "未設定";
  }
  return LEARNING_PHASE_LABELS[phase] ?? phase;
}

