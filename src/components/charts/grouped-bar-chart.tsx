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

const LABEL_MAX_CHARS = 22;

interface CategoryTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  /** Set for the horizontal-layout X axis to anchor labels under the tick. */
  horizontal?: boolean;
}

/**
 * Ellipsized category label with the full text on hover. Recharts' default
 * tick wraps long names (divisions, designations) onto unlimited lines, which
 * collide with neighbouring rows exactly like the gap charts used to.
 */
function CategoryTick({ x = 0, y = 0, payload, horizontal }: CategoryTickProps) {
  const full = String(payload?.value ?? "");
  const max = horizontal ? 14 : LABEL_MAX_CHARS;
  const label =
    full.length > max ? `${full.slice(0, max - 1).trimEnd()}…` : full;
  return (
    <text
      x={x}
      y={y}
      dy={horizontal ? 12 : 4}
      textAnchor={horizontal ? "middle" : "end"}
      fontSize={horizontal ? 11 : 12}
      fill="#475569"
    >
      <title>{full}</title>
      {label}
    </text>
  );
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
  height,
}: GroupedBarChartProps) {
  const isVertical = layout === "vertical"; // horizontal bars
  // Horizontal-bar rows need vertical room per category × series; a fixed
  // height crushes them once real orgs bring more than a few divisions.
  const rowsPerCategory = stacked ? 1 : series.length;
  const h =
    height ??
    (isVertical
      ? Math.max(220, data.length * (rowsPerCategory * 18 + 18) + 60)
      : 280);
  return (
    <ResponsiveContainer width="100%" height={h}>
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
              width={160}
              tick={<CategoryTick />}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={categoryKey}
              tick={<CategoryTick horizontal />}
              interval="preserveStartEnd"
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
