/**
 * Domain constants for Caliber.
 * Pure data — no I/O. Mirrors PRD §4 and SCHEMA.md computation logic.
 */

export const SYSTEM_ROLES = {
  EMPLOYEE: "employee",
  LINE_MANAGER: "line_manager",
  HR_ADMIN: "hr_admin",
  EXECUTIVE: "executive",
  SYSTEM: "system",
} as const;
export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

/** Fixed 1–5 competency rating scale (PRD §4.8). */
export const RATING_SCALE = [
  { level: 1, label: "Amateur" },
  { level: 2, label: "Collaborator" },
  { level: 3, label: "Enabler" },
  { level: 4, label: "Driving Force" },
  { level: 5, label: "Visionary" },
] as const;

export const TRAFFIC_LIGHT = {
  STRONG: "strong",
  DEVELOPING: "developing",
  NEEDS_FOCUS: "needs_focus",
  CRITICAL: "critical",
} as const;
export type TrafficLight = (typeof TRAFFIC_LIGHT)[keyof typeof TRAFFIC_LIGHT];

export const CALIBRATION_FLAG = {
  NONE: "none",
  MINOR_OUTLIER: "minor_outlier",
  MAJOR_OUTLIER: "major_outlier",
} as const;
export type CalibrationFlag =
  (typeof CALIBRATION_FLAG)[keyof typeof CALIBRATION_FLAG];

/**
 * Default thresholds (HR-configurable in Phase 2, fixed defaults at MVP).
 * Traffic light is keyed on the gap = required − managerLevel.
 */
export const DEFAULT_GAP_THRESHOLDS = {
  strongMax: 0, // gap <= 0           → strong
  developingMax: 1, // 0 < gap <= 1    → developing
  needsFocusMax: 2, // 1 < gap <= 2    → needs_focus
  // gap > 2            → critical
} as const;

/** Calibration is keyed on |difference| = |selfLevel − managerLevel|. */
export const DEFAULT_CALIBRATION_THRESHOLDS = {
  alignedMax: 1, // |diff| <= 1  → none
  minorMax: 2, // 1 < |diff| <= 2 → minor_outlier
  // |diff| > 2      → major_outlier
} as const;

export const STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
} as const;
export type SideStatus = (typeof STATUS)[keyof typeof STATUS];

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  IN_CALIBRATION: "in_calibration",
  LOCKED: "locked",
  ARCHIVED: "archived",
} as const;
export type CampaignStatus =
  (typeof CAMPAIGN_STATUS)[keyof typeof CAMPAIGN_STATUS];

export const FINAL_STATUS = {
  PENDING: "pending",
  CALIBRATION_REQUIRED: "calibration_required",
  FINALIZED: "finalized",
  ARCHIVED: "archived",
} as const;
export type FinalStatus = (typeof FINAL_STATUS)[keyof typeof FINAL_STATUS];
