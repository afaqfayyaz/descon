"use client";

import { RadarGapChart } from "@/components/charts/radar-gap-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import { DonutStat } from "@/components/charts/donut-stat";
import type {
  BarPoint,
  GroupedPoint,
  RadarPoint,
} from "@/lib/services/analytics.service";

interface DistributionSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  areaRadar: RadarPoint[];
  areaGaps: BarPoint[];
  distribution: DistributionSlice[];
  byDivision: GroupedPoint[];
  byDesignation: GroupedPoint[];
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="mb-2 text-xs text-slate-400">{subtitle}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

const REQUIRED_COLOR = "#94a3b8";
const CURRENT_COLOR = "#0a84ff";

export function CampaignCharts({
  areaRadar,
  areaGaps,
  distribution,
  byDivision,
  byDesignation,
}: Props) {
  const totalEmployees = distribution.reduce((s, d) => s + d.value, 0);
  const groupSeries = [
    { key: "required", label: "Required", color: REQUIRED_COLOR },
    { key: "current", label: "Current", color: CURRENT_COLOR },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Competency radar"
        subtitle="Required vs current level per area (0–5)"
      >
        {areaRadar.length > 0 ? (
          <RadarGapChart data={areaRadar} />
        ) : (
          <Empty />
        )}
      </Panel>

      <Panel title="Gap by competency area" subtitle="Average gap (Required − Current)">
        {areaGaps.length > 0 ? (
          <HorizontalBarChart data={areaGaps} format="gap" />
        ) : (
          <Empty />
        )}
      </Panel>

      <Panel
        title="Workforce distribution"
        subtitle="Employees by competency status"
      >
        {totalEmployees > 0 ? (
          <div className="flex items-center gap-6">
            <DonutStat
              value={100}
              segments={distribution
                .filter((d) => d.value > 0)
                .map((d) => ({ value: d.value, color: d.color, label: d.label }))}
              centerValueFormatter={() => `${totalEmployees}`}
              label="assessed"
            />
            <ul className="space-y-1.5 text-sm">
              {distribution.map((d) => (
                <li key={d.label} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-sm"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-slate-600">{d.label}</span>
                  <span className="ml-auto font-semibold text-slate-800">
                    {d.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>

      <Panel
        title="By designation"
        subtitle="Required vs current level (0–5)"
      >
        {byDesignation.length > 0 ? (
          <GroupedBarChart
            data={byDesignation.map((d) => ({
              category: d.category,
              required: d.required,
              current: d.current,
            }))}
            categoryKey="category"
            series={groupSeries}
            domain={[0, 5]}
          />
        ) : (
          <Empty />
        )}
      </Panel>

      <Panel
        title="By division"
        subtitle="Required vs current level (0–5)"
      >
        {byDivision.length > 0 ? (
          <GroupedBarChart
            data={byDivision.map((d) => ({
              category: d.category,
              required: d.required,
              current: d.current,
            }))}
            categoryKey="category"
            series={groupSeries}
            domain={[0, 5]}
          />
        ) : (
          <Empty />
        )}
      </Panel>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-slate-400">
      No scored results yet.
    </div>
  );
}
