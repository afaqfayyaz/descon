import Link from "next/link";
import {
  Users,
  BadgeCheck,
  AlertTriangle,
  Megaphone,
  ArrowRight,
  User,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/permissions";
import { executiveService } from "@/lib/services/executive.service";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { DIRECT_ASSIGNMENT_DESCRIPTION } from "@/lib/services/campaign.service";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { Widget } from "@/components/dashboard/widget";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { DonutStat } from "@/components/charts/donut-stat";
import { CompletionPie } from "@/components/charts/completion-pie";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { DistributionDonut } from "@/components/charts/distribution-donut";
import { RadarGapChart } from "@/components/charts/radar-gap-chart";
import { gapColor } from "@/components/charts/chart-theme";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-info/10 text-info",
  in_calibration: "bg-gap-developing/10 text-gap-developing",
};

function shortDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

/** Thin completion bar (completed / total). */
function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-text-tertiary">
        {completed}/{total}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  await requirePermission("framework.view");
  const [overview, campaigns, headcount] = await Promise.all([
    executiveService.getOverview(),
    campaignRepo.findAll(),
    // Staff only — admin accounts aren't assessed, so counting them here would
    // overstate headcount and never reconcile with the assessed figure.
    userRepo.count({ kind: "staff" }),
  ]);

  const launched = campaigns.filter((c) => c.status !== "draft");
  const running = launched.filter(
    (c) => c.status === "active" || c.status === "in_calibration",
  );
  const totals = launched.reduce(
    (acc, c) => ({
      participants: acc.participants + c.stats.totalParticipants,
      self: acc.self + c.stats.selfCompleted,
      manager: acc.manager + c.stats.managerCompleted,
    }),
    { participants: 0, self: 0, manager: 0 },
  );

  const topGaps = overview.topGaps.map((g) => ({
    label: `${g.subCode} ${g.subName}`,
    value: g.avgGap,
    color: gapColor(g.avgGap),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          HR Control Center
        </h1>
        <p className="text-sm text-text-secondary">
          Company-wide gap analysis and live assessment progress.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="People"
          value={headcount}
          icon={Users}
          accent="navy"
          hint="active in the directory"
        />
        <KpiCard
          label="Assessed"
          value={overview.kpis.employeesAssessed}
          icon={BadgeCheck}
          accent="blue"
          hint={
            overview.kpis.employeesAssessed > 0
              ? `avg capability ${overview.kpis.avgCapabilityPercent}%`
              : "no results yet"
          }
        />
        <KpiCard
          label="Critical Gaps"
          value={overview.kpis.criticalGaps}
          icon={AlertTriangle}
          accent="neutral"
          hint="org-wide, needs attention"
        />
        <KpiCard
          label="Running Assessments"
          value={running.length}
          icon={Megaphone}
          accent="navy"
          hint="active or in calibration"
        />
      </div>

      {overview.hasData ? (
        <>
          <WidgetGrid>
            <Widget
              title="Active Assessments"
              info="Campaigns and one-on-one assignments currently collecting responses, with self and manager completion."
              className="md:col-span-2"
              empty={running.length === 0}
            >
              <div className="divide-y divide-border">
                {running.slice(0, 6).map((c) => {
                  const oneOnOne =
                    c.description === DIRECT_ASSIGNMENT_DESCRIPTION;
                  return (
                    <div key={c._id.toString()} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={`/campaigns/${c._id.toString()}`}
                          className="truncate text-sm font-medium text-primary hover:underline"
                        >
                          {oneOnOne && (
                            <User className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                          )}
                          {c.name}
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          {oneOnOne && (
                            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                              1-on-1
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_STYLES[c.status] ?? "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-text-tertiary">
                            due {shortDate(c.selfAssessmentDeadline)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        <div>
                          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                            Self
                          </div>
                          <ProgressBar
                            completed={c.stats.selfCompleted}
                            total={c.stats.totalParticipants}
                          />
                        </div>
                        <div>
                          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                            Manager
                          </div>
                          <ProgressBar
                            completed={c.stats.managerCompleted}
                            total={c.stats.totalParticipants}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-right">
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                >
                  All assessments <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Widget>

            <Widget
              title="Workforce Distribution"
              info="Assessed employees grouped by overall competency status."
            >
              <DistributionDonut slices={overview.distribution} />
            </Widget>

            <Widget
              title="Company Gap Radar"
              info="Average required vs current level for each competency area (0–5)."
              empty={overview.areaRadar.length === 0}
            >
              <RadarGapChart data={overview.areaRadar} />
            </Widget>

            <Widget
              title="Top Capability Gaps"
              subtitle="highest required − manager"
              info="Sub-competencies with the largest average gap. Colored by traffic-light status."
              empty={topGaps.length === 0}
            >
              <HorizontalBarChart data={topGaps} format="gap" />
              <div className="mt-3 text-right">
                <Link
                  href="/executive"
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                >
                  Full executive view <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Widget>

            <Widget
              title="Assessment Completion"
              info="Submitted self-assessments and manager ratings across launched campaigns."
            >
              <div className="flex flex-wrap items-center justify-around gap-4">
                <div>
                  <div className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    Self
                  </div>
                  <CompletionPie
                    completed={totals.self}
                    total={totals.participants}
                    size={110}
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    Manager
                  </div>
                  <CompletionPie
                    completed={totals.manager}
                    total={totals.participants}
                    size={110}
                  />
                </div>
                <DonutStat
                  value={overview.kpis.avgCapabilityPercent}
                  label="Capability"
                  size={110}
                />
              </div>
            </Widget>
          </WidgetGrid>
        </>
      ) : running.length > 0 ? (
        // Assessments are out but nothing is scored yet — saying "get started"
        // here would contradict the Running Assessments count above.
        <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-primary">
            Assessments in progress
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {running.length} assessment{running.length === 1 ? " is" : "s are"}{" "}
            collecting responses. Company-wide gap analysis appears once both
            the self and manager sides are submitted.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/assessment">Track progress</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/campaigns">View campaigns</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-text-primary">Get started</h2>
          <p className="mt-1 text-sm text-text-secondary">
            The competency framework is loaded. Review it, then send an
            assessment to populate company-wide gap analysis.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/assessment">Send an assessment</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/framework">View framework</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
