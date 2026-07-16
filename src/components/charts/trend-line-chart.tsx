"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AXIS, GRID, TOOLTIP_BG, CHART_SERIES } from "./chart-theme";

export interface TrendSeries {
  key: string;
  label: string;
  color?: string;
}

export interface TrendLineChartProps {
  data: Record<string, number | string>[];
  xKey: string;
  series: TrendSeries[];
  domain?: [number, number];
  height?: number;
  area?: boolean;
}

/** Campaign-over-time trend line / area chart. */
export function TrendLineChart({
  data,
  xKey,
  series,
  domain,
  height = 260,
  area = false,
}: TrendLineChartProps) {
  const Chart = area ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <defs>
          {series.map((s, i) => {
            const c = s.color ?? CHART_SERIES[i % CHART_SERIES.length];
            return (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.25} />
                <stop offset="100%" stopColor={c} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#475569" }}
          axisLine={{ stroke: GRID }}
          tickLine={false}
        />
        <YAxis
          domain={domain ?? ["auto", "auto"]}
          tick={{ fontSize: 11, fill: AXIS }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: TOOLTIP_BG,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 12,
          }}
          labelStyle={{ color: "#CBD5E1" }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />}
        {series.map((s, i) => {
          const c = s.color ?? CHART_SERIES[i % CHART_SERIES.length];
          return area ? (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={c}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
              dot={{ r: 3, fill: c }}
              isAnimationActive={false}
            />
          ) : (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={c}
              strokeWidth={2}
              dot={{ r: 3, fill: c }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          );
        })}
      </Chart>
    </ResponsiveContainer>
  );
}
