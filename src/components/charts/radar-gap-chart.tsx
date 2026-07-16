"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ACCENT, PRIMARY, GRID, AXIS, TOOLTIP_BG } from "./chart-theme";

export interface RadarDatum {
  /** Axis label (competency area). */
  area: string;
  manager: number;
  required: number;
}

export interface RadarGapChartProps {
  data: RadarDatum[];
  height?: number;
  /** Override the "Manager level" series label (e.g. for a self-only preview). */
  seriesLabel?: string;
}

/**
 * PetroSkills-style competency radar ("pentagon"): each competency area is an
 * axis on a 0–5 scale, with the manager-rated level overlaid on the required
 * level so gaps are visible at a glance. Serializable props only (RSC-safe).
 */
export function RadarGapChart({
  data,
  height = 320,
  seriesLabel = "Manager level",
}: RadarGapChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis
          dataKey="area"
          tick={{ fontSize: 10, fill: AXIS }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 5]}
          tickCount={6}
          tick={{ fontSize: 9, fill: AXIS }}
        />
        <Radar
          name="Required"
          dataKey="required"
          stroke={PRIMARY}
          fill={PRIMARY}
          fillOpacity={0.12}
          isAnimationActive={false}
        />
        <Radar
          name={seriesLabel}
          dataKey="manager"
          stroke={ACCENT}
          fill={ACCENT}
          fillOpacity={0.4}
          isAnimationActive={false}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
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
      </RadarChart>
    </ResponsiveContainer>
  );
}
