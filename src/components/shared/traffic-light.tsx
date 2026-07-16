import { cn } from "@/lib/utils/cn";
import type { TrafficLight as TrafficLightStatus } from "@/lib/domain/constants";

const CONFIG: Record<
  TrafficLightStatus,
  { label: string; dot: string; chip: string }
> = {
  strong: {
    label: "Strong",
    dot: "bg-gap-strong",
    chip: "bg-gap-strong/10 text-gap-strong",
  },
  developing: {
    label: "Developing",
    dot: "bg-gap-developing",
    chip: "bg-gap-developing/10 text-gap-developing",
  },
  needs_focus: {
    label: "Needs Focus",
    dot: "bg-gap-focus",
    chip: "bg-gap-focus/10 text-gap-focus",
  },
  critical: {
    label: "Critical",
    dot: "bg-gap-critical",
    chip: "bg-gap-critical/10 text-gap-critical",
  },
};

interface Props {
  status: TrafficLightStatus;
  showLabel?: boolean;
  className?: string;
}

/** The gap status indicator used across heatmaps and detail views. */
export function TrafficLight({ status, showLabel = true, className }: Props) {
  const cfg = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        cfg.chip,
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
      {showLabel && cfg.label}
    </span>
  );
}
