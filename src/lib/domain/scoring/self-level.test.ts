import { describe, it, expect } from "vitest";
import {
  calculateSelfLevel,
  round2,
  type ScoringQuestion,
  type ScoringAnswer,
} from "./self-level";

const ABCD: ScoringQuestion = {
  options: [
    { letter: "A", score: 1 },
    { letter: "B", score: 2 },
    { letter: "C", score: 3 },
    { letter: "D", score: 4 },
  ],
};

describe("calculateSelfLevel", () => {
  it("normalizes earned/max to a 0–5 scale", () => {
    const questions = [ABCD, ABCD, ABCD];
    const answers: ScoringAnswer[] = [
      { questionIndex: 0, selectedOption: "C" }, // 3
      { questionIndex: 1, selectedOption: "B" }, // 2
      { questionIndex: 2, selectedOption: "C" }, // 3
    ];
    // (8 / 12) * 5 = 3.33
    expect(calculateSelfLevel(questions, answers)).toBe(3.33);
  });

  it("returns 5.0 when all top options are chosen", () => {
    const questions = [ABCD, ABCD];
    const answers: ScoringAnswer[] = [
      { questionIndex: 0, selectedOption: "D" },
      { questionIndex: 1, selectedOption: "D" },
    ];
    expect(calculateSelfLevel(questions, answers)).toBe(5);
  });

  it("ignores answers that reference unknown options", () => {
    const answers: ScoringAnswer[] = [
      { questionIndex: 0, selectedOption: "Z" },
    ];
    expect(calculateSelfLevel([ABCD], answers)).toBeNull();
  });

  it("returns null when there is nothing to score", () => {
    expect(calculateSelfLevel([], [])).toBeNull();
  });

  it("weights heavier questions more in the average", () => {
    // Q0 (weight 3) answered A→1.25, Q1 (weight 1) answered D→5.
    // weighted = (1.25*3 + 5*1) / 4 = 8.75/4 = 2.19
    const questions: ScoringQuestion[] = [
      { ...ABCD, weight: 3 },
      { ...ABCD, weight: 1 },
    ];
    const answers: ScoringAnswer[] = [
      { questionIndex: 0, selectedOption: "A" },
      { questionIndex: 1, selectedOption: "D" },
    ];
    expect(calculateSelfLevel(questions, answers)).toBe(2.19);
  });

  it("ignores questions with zero weight", () => {
    const questions: ScoringQuestion[] = [
      { ...ABCD, weight: 0 },
      { ...ABCD, weight: 1 },
    ];
    const answers: ScoringAnswer[] = [
      { questionIndex: 0, selectedOption: "A" }, // ignored (weight 0)
      { questionIndex: 1, selectedOption: "D" }, // 5
    ];
    expect(calculateSelfLevel(questions, answers)).toBe(5);
  });
});

describe("round2", () => {
  it("rounds to two decimals", () => {
    expect(round2(3.125)).toBe(3.13);
    expect(round2(2.916666)).toBe(2.92);
  });
});
