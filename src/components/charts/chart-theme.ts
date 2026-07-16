/**
 * Single source of truth for chart colors so recharts widgets, the
 * TrafficLight chip, and the heatmap all stay visually in sync with the
 * Caliber design tokens (tailwind.config.ts).
 */
import type { TrafficLight } from "@/lib/domain/constants";

/** Categorical series palette (navy → electric-blue ramp + neutrals). */
export const CHART_SERIES = [
  "#16305C", // primary
  "#0A84FF", // accent
  "#5CA8FF",
  "#476193",
  "#7E9BC9",
  "#B3C5E0",
] as const;

/** Proficiency levels 1..5 (Amateur → Visionary), light → deep. */
export const PROFICIENCY_RAMP = [
  "#CBD5E1", // 1 Amateur
  "#7E9BC9", // 2 Collaborator
  "#476193", // 3 Enabler
  "#1E3A6E", // 4 Driving Force
  "#0A84FF", // 5 Visionary
] as const;

/** Gap traffic-light colors (must match tailwind `gap.*` + scoring semantics). */
export const TRAFFIC: Record<TrafficLight, string> = {
  strong: "#10B981",
  developing: "#F59E0B",
  needs_focus: "#F97316",
  critical: "#EF4444",
};

export const GRID = "#E2E8F0";
export const AXIS = "#8190A5";
export const TOOLTIP_BG = "#0F1B2D";
export const ACCENT = "#0A84FF";
export const PRIMARY = "#16305C";
export const TRACK = "#E2E8F0";

/** Resolve a traffic-light status (or null) to a hex color. */
export function trafficColor(tl: TrafficLight | null | undefined): string {
  return tl ? TRAFFIC[tl] : "#CBD5E1";
}

/** Map a raw gap value to a traffic-light color using default thresholds. */
export function gapColor(gap: number): string {
  if (gap <= 0) return TRAFFIC.strong;
  if (gap <= 1) return TRAFFIC.developing;
  if (gap <= 2) return TRAFFIC.needs_focus;
  return TRAFFIC.critical;
}

/** Color for a proficiency level (1..5); clamps out-of-range. */
export function proficiencyColor(level: number): string {
  const i = Math.max(1, Math.min(5, Math.round(level))) - 1;
  return PROFICIENCY_RAMP[i] ?? PROFICIENCY_RAMP[0];
}
