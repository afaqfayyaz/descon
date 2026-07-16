/**
 * Roll-up computations: sub-competency results → area → overall.
 * Pure functions — no I/O, no side effects (PRD §5.7 / §9.1).
 */
import { round2 } from "@/lib/domain/scoring/self-level";
import {
  calculateGap,
  getTrafficLight,
  type GapThresholds,
} from "@/lib/domain/scoring/gap";
import { DEFAULT_GAP_THRESHOLDS, type TrafficLight } from "@/lib/domain/constants";

export interface SubResult {
  readonly managerLevel: number | null;
  readonly requiredLevel: number;
}

export interface AreaRollup {
  readonly managerLevel: number;
  readonly requiredLevel: number;
  readonly gap: number;
  readonly trafficLight: TrafficLight;
}

/**
 * Average the manager and required levels across a set of sub-competency
 * results to produce an area-level rollup. Sub-results without a manager
 * level are ignored.
 *
 * @returns The area rollup, or null if no scorable sub-results exist.
 */
export function rollupArea(
  results: ReadonlyArray<SubResult>,
  thresholds: GapThresholds = DEFAULT_GAP_THRESHOLDS,
): AreaRollup | null {
  const scored = results.filter((r) => r.managerLevel !== null);
  if (scored.length === 0) return null;

  const avgManager =
    scored.reduce((sum, r) => sum + (r.managerLevel as number), 0) /
    scored.length;
  const avgRequired =
    scored.reduce((sum, r) => sum + r.requiredLevel, 0) / scored.length;

  const managerLevel = round2(avgManager);
  const requiredLevel = round2(avgRequired);
  const gap = round2(calculateGap(requiredLevel, managerLevel));

  return {
    managerLevel,
    requiredLevel,
    gap,
    trafficLight: getTrafficLight(gap, thresholds),
  };
}

export interface WeightedArea {
  readonly managerLevel: number;
  readonly requiredLevel: number;
  readonly weight: number;
}

export interface OverallRollup {
  readonly managerLevel: number;
  readonly requiredLevel: number;
  readonly gap: number;
  readonly capabilityPercent: number;
  readonly trafficLight: TrafficLight;
}

/**
 * Weighted average of area rollups → overall capability (PRD §9.1).
 * capabilityPercent = (overallManagerLevel / 5) * 100.
 *
 * @returns The overall rollup, or null when no weighted areas exist.
 */
export function rollupOverall(
  areas: ReadonlyArray<WeightedArea>,
  thresholds: GapThresholds = DEFAULT_GAP_THRESHOLDS,
): OverallRollup | null {
  const totalWeight = areas.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight === 0 || areas.length === 0) return null;

  const weightedManager =
    areas.reduce((sum, a) => sum + a.managerLevel * a.weight, 0) / totalWeight;
  const weightedRequired =
    areas.reduce((sum, a) => sum + a.requiredLevel * a.weight, 0) / totalWeight;

  const managerLevel = round2(weightedManager);
  const requiredLevel = round2(weightedRequired);
  const gap = round2(calculateGap(requiredLevel, managerLevel));

  return {
    managerLevel,
    requiredLevel,
    gap,
    capabilityPercent: round2((managerLevel / 5) * 100),
    trafficLight: getTrafficLight(gap, thresholds),
  };
}
