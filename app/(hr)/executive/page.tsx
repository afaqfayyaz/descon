import Link from "next/link";
import { Megaphone, Users, Gauge, AlertTriangle } from "lucide-react";
import { requirePermission } from "@/lib/auth/permissions";
import { executiveService } from "@/lib/services/executive.service";
import { KpiCard } from "@/components/shared/kpi-card";
import { Widget } from "@/components/dashboard/widget";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { DonutStat } from "@/components/charts/donut-stat";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import { RadarGapChart } from "@/components/charts/radar-gap-chart";
import { DistributionDonut } from "@/components/charts/distribution-donut";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { gapColor, trafficColor } from "@/components/charts/chart-theme";

export default async function ExecutivePage() {
  await requirePermission("report.org");
  const data = await executiveService.getOverview();

  if (!data.hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Executive overview
        </h1>
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-text-secondary">
          No assessment results yet. Launch a campaign and complete assessments
          to populate organisation-wide insights.
        </div>
      </div>
    );
  }

  const topGaps = data.topGaps.map((g) => ({
    label: `${g.subCode} ${g.subName}`,
    value: g.avgGap,
    color: gapColor(g.avgGap),
  }));
  const strengths = data.strengths.map((g) => ({
    label: `${g.subCode} ${g.subName}`,
    value: g.avgGap,
    color: gapColor(g.avgGap),
  }));
  const divisionData = data.divisions.map((d) => ({
    division: d.division,
    "Avg gap": d.avgGap,
    "Critical": d.critical,
    color: trafficColor(d.trafficLight),
  }));
  const trendData = data.trends.map((t) => ({
    name: t.name,
    "Avg gap": t.avgGap ?? 0,
    "Avg level": t.avgManager ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Executive overview
        </h1>
        <p className="text-sm text-text-secondary">
          Organisation-wide capability across {data.kpis.campaigns} launched
          campaign(s).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Campaigns" value={data.kpis.campaigns} icon={Megaphone} accent="navy" />
        <KpiCard label="Employees assessed" value={data.kpis.employeesAssessed} icon={Users} accent="blue" />
        <KpiCard label="Avg capability" value={`${data.kpis.avgCapabilityPercent}%`} hint="manager vs required" icon={Gauge} accent="navy" />
        <KpiCard label="Critical gaps" value={data.kpis.criticalGaps} icon={AlertTriangle} accent="neutral" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Avg required" value={data.kpis.avgRequired.toFixed(1)} accent="neutral" />
        <KpiCard label="Avg current" value={data.kpis.avgCurrent.toFixed(1)} accent="blue" />
        <KpiCard
          label="Avg gap"
          value={`${data.kpis.avgGap > 0 ? "+" : ""}${data.kpis.avgGap.toFixed(1)}`}
          accent="navy"
        />
      </div>

      <WidgetGrid>
        <Widget
          title="Capability Status"
          info="Average manager level vs required, organisation-wide."
        >
          <div className="flex justify-center py-4">
            <DonutStat value={data.kpis.avgCapabilityPercent} label="Capability" size={180} />
          </div>
        </Widget>

        <Widget
          title="Workforce Distribution"
          info="Assessed employees grouped by overall competency status."
        >
          <DistributionDonut slices={data.distribution} />
        </Widget>

        <Widget
          title="Organisation Competency Radar"
          info="Average required vs current level for each competency area (0–5)."
          empty={data.areaRadar.length === 0}
        >
          <RadarGapChart data={data.areaRadar} />
        </Widget>

        <Widget
          title="Top Capability Gaps"
          info="Sub-competencies with the largest average gap (required − manager)."
          className="xl:col-span-2"
          empty={topGaps.length === 0}
        >
          <HorizontalBarChart data={topGaps} format="gap" />
        </Widget>

        <Widget
          title="By Designation"
          info="Average required vs current level per designation (0–5)."
          className="xl:col-span-1"
          empty={data.designations.length === 0}
        >
          <GroupedBarChart
            data={data.designations.map((d) => ({
              category: d.designation,
              required: d.required,
              current: d.current,
            }))}
            categoryKey="category"
            series={[
              { key: "required", label: "Required", color: "#94a3b8" },
              { key: "current", label: "Current", color: "#0a84ff" },
            ]}
            domain={[0, 5]}
            height={Math.max(200, data.designations.length * 52)}
          />
        </Widget>

        <Widget
          title="Strongest Areas"
          info="Sub-competencies meeting or exceeding the required level."
          empty={strengths.length === 0}
        >
          <HorizontalBarChart
            data={strengths}
            format="gap"
            domain={[Math.min(...strengths.map((s) => s.value), 0), 0]}
          />
        </Widget>

        <Widget
          title="Division Comparison"
          info="Average gap and number of critical gaps per division."
          className="xl:col-span-2"
          empty={divisionData.length === 0}
        >
          <GroupedBarChart
            data={divisionData}
            categoryKey="division"
            series={[
              { key: "Avg gap", label: "Avg gap", color: "#0A84FF" },
              { key: "Critical", label: "Critical gaps", color: "#EF4444" },
            ]}
            height={Math.max(200, divisionData.length * 48)}
          />
        </Widget>

        <Widget
          title="Campaign Trends"
          info="Average gap and manager level over launched campaigns."
          className="xl:col-span-3"
          empty={trendData.length < 2}
          emptyText="Need at least two launched campaigns to show a trend."
        >
          <TrendLineChart
            data={trendData}
            xKey="name"
            series={[
              { key: "Avg gap", label: "Avg gap", color: "#F97316" },
              { key: "Avg level", label: "Avg manager level", color: "#16305C" },
            ]}
            area
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {data.trends.map((t) => (
              <Link
                key={t.campaignId}
                href={`/campaigns/${t.campaignId}/heatmap`}
                className="rounded-full border border-border bg-surface-sunken px-3 py-1 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </Widget>
      </WidgetGrid>
    </div>
  );
}
