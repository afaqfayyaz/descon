"use client";

import { DonutStat } from "@/components/charts/donut-stat";

export interface DistributionSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Composition donut with a legend — used for traffic-light workforce
 * distributions (No gap / Developing / Needs focus / Critical). The center
 * shows the total count.
 */
export function DistributionDonut({
  slices,
  centerLabel = "assessed",
  size = 170,
}: {
  slices: DistributionSlice[];
  centerLabel?: string;
  size?: number;
}) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        No scored results yet.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-6">
      <DonutStat
        value={100}
        size={size}
        segments={slices
          .filter((d) => d.value > 0)
          .map((d) => ({ value: d.value, color: d.color, label: d.label }))}
        centerValueFormatter={() => `${total}`}
        label={centerLabel}
      />
      <ul className="space-y-1.5 text-sm">
        {slices.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-text-secondary">{d.label}</span>
            <span className="ml-auto pl-4 font-semibold text-text-primary">
              {d.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
