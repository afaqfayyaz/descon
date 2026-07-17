/**
 * Domain constants for Caliber.
 * Pure data — no I/O. Mirrors PRD §4 and SCHEMA.md computation logic.
 */

export const SYSTEM_ROLES = {
  EMPLOYEE: "employee",
  LINE_MANAGER: "line_manager",
  HR_ADMIN: "hr_admin",
  EXECUTIVE: "executive",
  SUPER_ADMIN: "super_admin",
  SYSTEM: "system",
} as const;
export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

/**
 * Accounts are either *staff* — real people who are assessed and appear in the
 * People Directory — or *application users*, who administer the platform and
 * are managed under Settings. The two are kept strictly separate: an
 * application user is never assessed, and never appears in the directory.
 * A person needing both gets one account of each kind.
 */
export const APPLICATION_ROLES: ReadonlyArray<SystemRole> = [
  SYSTEM_ROLES.HR_ADMIN,
  SYSTEM_ROLES.EXECUTIVE,
  SYSTEM_ROLES.SUPER_ADMIN,
  SYSTEM_ROLES.SYSTEM,
];

export const STAFF_ROLES: ReadonlyArray<SystemRole> = [
  SYSTEM_ROLES.EMPLOYEE,
  SYSTEM_ROLES.LINE_MANAGER,
];

/**
 * The break-glass account. Holds every permission implicitly and is hidden
 * from every list in the UI, so it can only be created or changed out-of-band
 * (scripts/create-admin.ts --super). Never surface it to end users.
 */
export const SUPER_ADMIN_ROLE = SYSTEM_ROLES.SUPER_ADMIN;

export function isApplicationUser(roles: ReadonlyArray<SystemRole>): boolean {
  return roles.some((r) => APPLICATION_ROLES.includes(r));
}

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
