import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Trend {
  value: number;
  direction: "up" | "down" | "flat";
  /** Whether the direction is a good thing (colors the delta green vs red). */
  good?: boolean;
}

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: Trend;
  accent?: "navy" | "blue" | "neutral";
  className?: string;
}

const ICON_CHIP: Record<NonNullable<Props["accent"]>, string> = {
  navy: "bg-primary/10 text-primary",
  blue: "bg-accent/10 text-accent",
  neutral: "bg-surface-sunken text-text-secondary",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  accent = "blue",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-5 shadow-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-text-secondary">{label}</div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-text-primary">
            {value}
          </div>
        </div>
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              ICON_CHIP[accent],
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
              trend.direction === "flat"
                ? "text-text-tertiary"
                : trend.good
                  ? "text-gap-strong"
                  : "text-gap-critical",
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUp className="h-3 w-3" />
            ) : trend.direction === "down" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}
          </span>
        )}
        {hint && <div className="text-xs text-text-tertiary">{hint}</div>}
      </div>
    </div>
  );
}
