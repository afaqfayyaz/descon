/**
 * Self-assessment level computation.
 * Pure functions — no I/O, no side effects (CODING_STANDARDS §Domain).
 */

export interface ScoringOption {
  readonly letter: string;
  readonly score: number;
}

export interface ScoringQuestion {
  readonly options: ReadonlyArray<ScoringOption>;
  /** Relative importance of this question. Defaults to 1 when omitted. */
  readonly weight?: number;
}

export interface ScoringAnswer {
  readonly questionIndex: number;
  readonly selectedOption: string;
}

/**
 * Calculate the self-assessment level for a single sub-competency as a
 * WEIGHTED average of each answered question's normalized score.
 *
 * For each answered question the selected option's score is normalized to the
 * 0–5 scale (`selected / maxScore * 5`), then averaged using the question's
 * `weight` (default 1):
 *   selfLevel = Σ(normalizedᵢ · weightᵢ) / Σ(weightᵢ)
 *
 * With uniform option ranges and equal weights this is identical to a simple
 * average, so existing (weight-1) behaviour is preserved.
 *
 * @returns Level on a 0–5 scale rounded to 2 dp, or null if nothing scorable.
 *
 * @example
 * // 2 questions, options A=1..D=4, answers D and A → avg(5, 1.25) = 3.13
 * calculateSelfLevel(questions, answers); // 3.13
 */
export function calculateSelfLevel(
  questions: ReadonlyArray<ScoringQuestion>,
  answers: ReadonlyArray<ScoringAnswer>,
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const answer of answers) {
    const question = questions[answer.questionIndex];
    if (!question || question.options.length === 0) continue;

    const selected = question.options.find(
      (o) => o.letter === answer.selectedOption,
    );
    if (!selected) continue;

    const maxScore = Math.max(...question.options.map((o) => o.score));
    if (maxScore <= 0) continue;

    const weight = question.weight ?? 1;
    if (weight <= 0) continue;

    const normalized = (selected.score / maxScore) * 5;
    weightedSum += normalized * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;

  return round2(weightedSum / totalWeight);
}

/** Round to 2 decimal places (banker-safe enough for this domain). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
