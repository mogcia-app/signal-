import {
  getLearningPhaseByInteractions,
  getLearningPhaseProgress,
} from "@/utils/learningPhase";

describe("learningPhase", () => {
  test("keeps accounts out of master mode until 250 interactions", () => {
    expect(getLearningPhaseByInteractions(33)).toBe("initial");
    expect(getLearningPhaseByInteractions(50)).toBe("learning");
    expect(getLearningPhaseByInteractions(125)).toBe("optimized");
    expect(getLearningPhaseByInteractions(249)).toBe("optimized");
    expect(getLearningPhaseByInteractions(250)).toBe("master");
  });

  test("calculates progress against the expanded phase thresholds", () => {
    expect(getLearningPhaseProgress(0)).toBe(0);
    expect(getLearningPhaseProgress(50)).toBe(25);
    expect(getLearningPhaseProgress(125)).toBe(50);
    expect(getLearningPhaseProgress(250)).toBe(100);
  });
});
