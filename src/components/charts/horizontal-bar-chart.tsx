"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { AXIS, GRID, TOOLTIP_BG, ACCENT } from "./chart-theme";

export interface HBarDatum {
  label: string;
  value: number;
  /** Pre-computed bar color (hex). Falls back to accent when omitted. */
  color?: string;
  meta?: string;
}

/**
 * Value display format. Kept as a string (not a function) so the chart can be
 * used directly from React Server Components, which cannot pass function props.
 */
export type HBarFormat = "number" | "gap" | "percent";

export interface HorizontalBarChartProps {
  data: HBarDatum[];
  format?: HBarFormat;
  domain?: [number, number];
  /** Optional vertical reference line (e.g. the zero-gap line). */
  referenceValue?: number;
  height?: number;
  showValues?: boolean;
}

function formatValue(v: number, format: HBarFormat): string {
  if (format === "percent") return `${v}%`;
  if (format === "gap") return `${v > 0 ? "+" : ""}${v}`;
  return `${v}`;
}

const LABEL_MAX_CHARS = 26;

interface CategoryTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
}

/**
 * Single-line, ellipsized row label with the full text as a hover tooltip.
 * Recharts' default tick wraps long names ("7.3 Vendor Governance &
 * Sustainability Compliance") onto unlimited lines, which overflow the row
 * height and collide with neighbouring labels.
 */
function CategoryTick({ x = 0, y = 0, payload }: CategoryTickProps) {
  const full = String(payload?.value ?? "");
  const label =
    full.length > LABEL_MAX_CHARS
      ? `${full.slice(0, LABEL_MAX_CHARS - 1).trimEnd()}…`
      : full;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="#475569">
      <title>{full}</title>
      {label}
    </text>
  );
}

/** Generic single-series horizontal bar chart (gaps, proficiency per area). */
export function HorizontalBarChart({
  data,
  format = "number",
  domain,
  referenceValue,
  height,
  showValues = true,
}: HorizontalBarChartProps) {
  const h = height ?? Math.max(120, data.length * 38 + 24);
  const valueFormatter = (v: number) => formatValue(v, format);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: showValues ? 44 : 12, bottom: 4, left: 8 }}
        barCategoryGap={10}
      >
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis
          type="number"
          domain={domain ?? [0, "auto"]}
          tick={{ fontSize: 11, fill: AXIS }}
          tickFormatter={valueFormatter}
          axisLine={{ stroke: GRID }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={190}
          tick={<CategoryTick />}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(10,132,255,0.06)" }}
          formatter={(v: number) => [valueFormatter(v), "Value"]}
          contentStyle={{
            background: TOOLTIP_BG,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 12,
          }}
          labelStyle={{ color: "#CBD5E1" }}
        />
        {referenceValue !== undefined && (
          <ReferenceLine x={referenceValue} stroke={AXIS} strokeDasharray="3 3" />
        )}
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? ACCENT} />
          ))}
          {showValues && (
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => valueFormatter(v)}
              style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
