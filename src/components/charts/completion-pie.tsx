"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ACCENT, TRACK } from "./chart-theme";

export interface CompletionPieProps {
  completed: number;
  total: number;
  completedLabel?: string;
  remainingLabel?: string;
  colors?: [string, string];
  size?: number;
}

/**
 * Completion donut for "Participant / Supervisor Assessment" style widgets.
 * Shows completed vs remaining with the percent in the center.
 */
export function CompletionPie({
  completed,
  total,
  completedLabel = "Completed",
  remainingLabel = "Remaining",
  colors = [ACCENT, TRACK],
  size = 150,
}: CompletionPieProps) {
  const safeTotal = Math.max(total, 0);
  const done = Math.max(0, Math.min(completed, safeTotal));
  const pct = safeTotal > 0 ? Math.round((done / safeTotal) * 100) : 0;
  const data = [
    { name: completedLabel, value: done, color: colors[0] },
    { name: remainingLabel, value: safeTotal - done, color: colors[1] },
  ];
  const outer = size / 2;

  return (
    <div className="flex items-center gap-4">
      <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
        <ResponsiveContainer width={size} height={size}>
          <PieChart>
            <Pie
              data={safeTotal > 0 ? data : [{ name: "", value: 1, color: TRACK }]}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={outer - 22}
              outerRadius={outer}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {(safeTotal > 0 ? data : [{ color: TRACK }]).map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-text-primary">
            {pct}%
          </span>
        </div>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[0] }} />
          <span className="text-text-secondary">{completedLabel}</span>
          <span className="font-semibold tabular-nums text-text-primary">{done}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[1] }} />
          <span className="text-text-secondary">{remainingLabel}</span>
          <span className="font-semibold tabular-nums text-text-primary">
            {safeTotal - done}
          </span>
        </div>
      </div>
    </div>
  );
}
