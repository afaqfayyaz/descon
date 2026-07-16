/**
 * Gap analysis and traffic-light status.
 * Pure functions — no I/O, no side effects.
 */
import {
  DEFAULT_GAP_THRESHOLDS,
  TRAFFIC_LIGHT,
  type TrafficLight,
} from "@/lib/domain/constants";

export interface GapThresholds {
  readonly strongMax: number;
  readonly developingMax: number;
  readonly needsFocusMax: number;
}

/**
 * Calculate the competency gap for a sub-competency.
 * A positive gap means the employee is below the required level.
 *
 * @param required - Required level for the employee's role (1–5)
 * @param current  - The manager's rating (1–5)
 */
export function calculateGap(required: number, current: number): number {
  return required - current;
}

/**
 * Map a gap value to a traffic-light status.
 * Defaults match PRD §4.9 (configurable by HR in Phase 2).
 */
export function getTrafficLight(
  gap: number,
  thresholds: GapThresholds = DEFAULT_GAP_THRESHOLDS,
): TrafficLight {
  if (gap <= thresholds.strongMax) return TRAFFIC_LIGHT.STRONG;
  if (gap <= thresholds.developingMax) return TRAFFIC_LIGHT.DEVELOPING;
  if (gap <= thresholds.needsFocusMax) return TRAFFIC_LIGHT.NEEDS_FOCUS;
  return TRAFFIC_LIGHT.CRITICAL;
}
