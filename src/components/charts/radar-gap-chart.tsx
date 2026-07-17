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
 * Word-wrap an axis label into at most `maxLines` lines of ~`maxChars` each,
 * ellipsizing whatever doesn't fit. Long area names must never collide with a
 * neighbouring vertex, whatever the container size.
 */
function wrapLabel(value: string, maxChars = 14, maxLines = 2): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < words.length; i++) {
    const candidate = current ? `${current} ${words[i]}` : words[i]!;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (lines.length === maxLines - 1) {
      // No room for another line — ellipsize what we have and stop.
      return [...lines, `${current.slice(0, maxChars - 1).trimEnd()}…`];
    }
    lines.push(current || candidate.slice(0, maxChars));
    current = current ? words[i]! : "";
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

interface AngleTickProps {
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  payload?: { value?: string | number };
}

/**
 * Custom vertex label: wrapped to two short lines, anchored away from the
 * chart centre, with the full name available as a hover tooltip. Recharts'
 * default tick renders the whole string on one line, which overlapped
 * neighbouring axes for names like "Operations & Sustainability Management".
 */
function AngleTick({ x = 0, y = 0, cx = 0, cy = 0, payload }: AngleTickProps) {
  const full = String(payload?.value ?? "");
  const lines = wrapLabel(full);

  // Push the label slightly outward along its axis so it clears the grid ring.
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const pad = 8;
  const tx = x + (dx / dist) * pad;
  let ty = y + (dy / dist) * pad;

  const anchor = Math.abs(dx) < 12 ? "middle" : dx > 0 ? "start" : "end";
  // Labels above the centre grow upward so multi-line text stays clear.
  if (dy < -12) ty -= (lines.length - 1) * 11;
  if (Math.abs(dy) <= 12) ty -= ((lines.length - 1) * 11) / 2;

  return (
    <text x={tx} y={ty} textAnchor={anchor} fontSize={10} fill={AXIS}>
      <title>{full}</title>
      {lines.map((line, i) => (
        <tspan key={i} x={tx} dy={i === 0 ? 0 : 11}>
          {line}
        </tspan>
      ))}
    </text>
  );
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
      <RadarChart data={data} outerRadius="66%" margin={{ top: 18, right: 24, bottom: 6, left: 24 }}>
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="area" tick={<AngleTick />} />
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
          dot={{ r: 2.5, fill: ACCENT, strokeWidth: 0 }}
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
