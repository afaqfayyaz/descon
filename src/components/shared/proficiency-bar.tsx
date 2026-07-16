import type { TrafficLight } from "@/lib/domain/constants";

const FILL: Record<string, string> = {
  strong: "bg-gap-strong",
  developing: "bg-gap-developing",
  needs_focus: "bg-gap-focus",
  critical: "bg-gap-critical",
};

/**
 * Horizontal proficiency bar on a 0–5 scale with a "required level" marker
 * (PRD §8.7 Data → ProficiencyBar). Current level fills the track; the
 * required level is shown as a vertical marker.
 */
export function ProficiencyBar({
  current,
  required,
  trafficLight,
  max = 5,
}: {
  current: number | null;
  required: number | null;
  trafficLight: TrafficLight | null;
  max?: number;
}) {
  const cur = current ?? 0;
  const fillPct = Math.max(0, Math.min(100, (cur / max) * 100));
  const reqPct =
    required === null ? null : Math.max(0, Math.min(100, (required / max) * 100));
  const fill = trafficLight ? (FILL[trafficLight] ?? "bg-primary") : "bg-primary";

  return (
    <div className="relative h-2.5 w-full rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full ${fill}`}
        style={{ width: `${fillPct}%` }}
      />
      {reqPct !== null && (
        <div
          className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-text-primary"
          style={{ left: `${reqPct}%` }}
          title={`Required: ${required}`}
        />
      )}
    </div>
  );
}
