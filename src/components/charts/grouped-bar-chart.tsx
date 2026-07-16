"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AXIS, GRID, TOOLTIP_BG, CHART_SERIES } from "./chart-theme";

export interface GroupedBarSeries {
  key: string;
  label: string;
  color?: string;
}

export interface GroupedBarChartProps {
  data: Record<string, number | string>[];
  categoryKey: string;
  series: GroupedBarSeries[];
  layout?: "horizontal" | "vertical";
  domain?: [number, number];
  stacked?: boolean;
  height?: number;
}

/**
 * Multi-series bar chart for division comparison and development-status
 * (e.g. self vs manager vs required).
 */
export function GroupedBarChart({
  data,
  categoryKey,
  series,
  layout = "vertical",
  domain,
  stacked = false,
  height = 280,
}: GroupedBarChartProps) {
  const isVertical = layout === "vertical"; // horizontal bars
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        barGap={2}
        barCategoryGap={isVertical ? 12 : "20%"}
      >
        <CartesianGrid
          stroke={GRID}
          horizontal={!isVertical}
          vertical={isVertical}
        />
        {isVertical ? (
          <>
            <XAxis
              type="number"
              domain={domain ?? [0, "auto"]}
              tick={{ fontSize: 11, fill: AXIS }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey={categoryKey}
              width={150}
              tick={{ fontSize: 12, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={categoryKey}
              tick={{ fontSize: 11, fill: "#475569" }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
            />
            <YAxis
              type="number"
              domain={domain ?? [0, "auto"]}
              tick={{ fontSize: 11, fill: AXIS }}
              axisLine={false}
              tickLine={false}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: "rgba(10,132,255,0.06)" }}
          contentStyle={{
            background: TOOLTIP_BG,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 12,
          }}
          labelStyle={{ color: "#CBD5E1" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? "stack" : undefined}
            fill={s.color ?? CHART_SERIES[i % CHART_SERIES.length]}
            radius={isVertical ? [0, 3, 3, 0] : [3, 3, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
