/**
 * Test-scope helpers. Pure, no I/O.
 *
 * A test can cover the whole framework ("full") or an explicit subset of
 * questions ("custom"). These helpers normalize an assessment's scope into
 * fast lookup sets and answer "is this question / sub-competency in scope?".
 */
import type { AssessmentScope } from "@/lib/domain/types/assessment.types";

export interface NormalizedScope {
  mode: "full" | "custom";
  questionIds: Set<string>;
  subCompetencyIds: Set<string>;
}

/** Default (whole-framework) scope, used when an assessment predates scoping. */
export const FULL_SCOPE: NormalizedScope = {
  mode: "full",
  questionIds: new Set(),
  subCompetencyIds: new Set(),
};

/** Normalize a persisted scope (possibly undefined) into lookup sets. */
export function normalizeScope(
  scope: AssessmentScope | null | undefined,
): NormalizedScope {
  if (!scope || scope.mode !== "custom") return FULL_SCOPE;
  return {
    mode: "custom",
    questionIds: new Set(scope.questionIds.map((id) => id.toString())),
    subCompetencyIds: new Set(scope.subCompetencyIds.map((id) => id.toString())),
  };
}

/** True when a question should be shown/scored under this scope. */
export function isQuestionInScope(
  scope: NormalizedScope,
  questionId: string,
): boolean {
  return scope.mode === "full" || scope.questionIds.has(questionId);
}

/** True when a sub-competency should be shown/rated/scored under this scope. */
export function isSubInScope(
  scope: NormalizedScope,
  subCompetencyId: string,
): boolean {
  return scope.mode === "full" || scope.subCompetencyIds.has(subCompetencyId);
}
