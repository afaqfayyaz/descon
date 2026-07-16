/**
 * Calibration outlier detection (self vs manager divergence).
 * Pure functions — no I/O, no side effects.
 */
import {
  CALIBRATION_FLAG,
  DEFAULT_CALIBRATION_THRESHOLDS,
  type CalibrationFlag,
} from "@/lib/domain/constants";

export interface CalibrationThresholds {
  readonly alignedMax: number;
  readonly minorMax: number;
}

/**
 * The signed difference between self-rating and manager-rating.
 * Positive → employee over-rates themselves; negative → under-rates.
 */
export function calculateDifference(
  selfLevel: number,
  managerLevel: number,
): number {
  return selfLevel - managerLevel;
}

/**
 * Flag a sub-competency where self and manager ratings diverge.
 * Defaults match PRD §9.3.
 */
export function getCalibrationFlag(
  difference: number,
  thresholds: CalibrationThresholds = DEFAULT_CALIBRATION_THRESHOLDS,
): CalibrationFlag {
  const magnitude = Math.abs(difference);
  if (magnitude <= thresholds.alignedMax) return CALIBRATION_FLAG.NONE;
  if (magnitude <= thresholds.minorMax) return CALIBRATION_FLAG.MINOR_OUTLIER;
  return CALIBRATION_FLAG.MAJOR_OUTLIER;
}
