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
  // The ring is a 0–100 gauge, but the centre must tell the truth: a team can
  // exceed its required level (capability > 100%), and rounding a real 132%
  // down to "100%" would misreport it. Guard NaN from empty datasets too.
  const safe = Number.isFinite(value) ? value : null;
  const clamped = Math.max(0, Math.min(100, safe ?? 0));
  const data = segments ?? [
    { value: clamped, color, label: label ?? "" },
    { value: 100 - clamped, color: TRACK, label: "" },
  ];
  const outer = size / 2;
  const inner = outer - thickness;

  // Scale the centre text to the hole: a fixed 30px font fits "67%" in a
  // 160px donut but "132%" overflowed a 110px one straight through the ring.
  // Bold tabular digits run ~0.7em per character, and the text needs clear
  // air inside the hole (0.8) — an exact fit still reads as touching.
  const hole = inner * 2;
  const valueText = safe === null ? "—" : centerValueFormatter(safe);
  const valueFont = Math.min(
    30,
    Math.floor((hole * 0.8) / (Math.max(valueText.length, 2) * 0.7)),
  );
  const labelFont = Math.max(8, Math.min(11, Math.floor(hole / 9)));

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
        <span
          className="font-bold tabular-nums leading-none text-text-primary"
          style={{ fontSize: valueFont }}
        >
          {valueText}
        </span>
        {label && (
          <span
            className="mt-1 max-w-full truncate px-1 uppercase tracking-wide text-text-tertiary"
            style={{ fontSize: labelFont, maxWidth: hole }}
            title={label}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
