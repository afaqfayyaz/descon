"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ACCENT, TRACK } from "./chart-theme";

export interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

export interface DonutStatProps {
  /** Headline value 0..100 shown in the center. */
  value: number;
  /** Caption under the center value. */
  label?: string;
  /** Optional multi-segment breakdown; overrides the single-value ring. */
  segments?: DonutSegment[];
  size?: number;
  thickness?: number;
  /** Single-value ring color (ignored when `segments` is provided). */
  color?: string;
  centerValueFormatter?: (v: number) => string;
}

/**
 * Percentage gauge / donut (replaces the old SVG DonutChart). Pass a single
 * `value` for a simple gauge, or `segments` for a composition donut.
 */
export function DonutStat({
  value,
  label,
  segments,
  size = 160,
  thickness = 18,
  color = ACCENT,
  centerValueFormatter = (v) => `${Math.round(v)}%`,
}: DonutStatProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const data = segments ?? [
    { value: clamped, color, label: label ?? "" },
    { value: 100 - clamped, color: TRACK, label: "" },
  ];
  const outer = size / 2;
  const inner = outer - thickness;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={inner}
            outerRadius={outer}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-text-primary">
          {centerValueFormatter(clamped)}
        </span>
        {label && (
          <span className="mt-0.5 text-[11px] uppercase tracking-wide text-text-tertiary">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
