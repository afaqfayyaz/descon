import Link from "next/link";
import { Users, ClipboardCheck, CalendarClock, AlertTriangle } from "lucide-react";
import { currentUserId } from "@/lib/auth/session";
import { questionnaireService } from "@/lib/services/questionnaire.service";
import { KpiCard } from "@/components/shared/kpi-card";
import { Widget } from "@/components/dashboard/widget";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { CompletionPie } from "@/components/charts/completion-pie";
import { trafficColor } from "@/components/charts/chart-theme";

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Complete",
};

const STATUS_STYLE: Record<string, string> = {
  not_started: "bg-surface-sunken text-text-secondary",
  in_progress: "bg-warning/10 text-warning",
  submitted: "bg-success/10 text-success",
};

export default async function TeamPage() {
  const uid = await currentUserId();
  const dash = await questionnaireService.getManagerDashboard(uid);
  const pending = dash.rows.filter((r) => r.status !== "submitted");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          My Team{dash.cycleName ? ` — ${dash.cycleName}` : ""}
        </h1>
        <p className="text-sm text-text-secondary">
          Rate each direct report&apos;s competencies for their active campaign.
        </p>
      </div>

      {dash.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-text-secondary">
          No direct reports to rate right now.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Team members" value={dash.kpis.teamCount} icon={Users} accent="navy" />
            <KpiCard
              label="Ratings complete"
              value={`${dash.kpis.ratingsComplete}/${dash.kpis.ratingsTotal}`}
              icon={ClipboardCheck}
              accent="blue"
            />
            <KpiCard
              label="Days left"
              value={
                dash.kpis.daysLeft === null
                  ? "—"
                  : dash.kpis.daysLeft < 0
                    ? "Overdue"
                    : dash.kpis.daysLeft
              }
              icon={CalendarClock}
              accent="neutral"
            />
            <KpiCard
              label="Critical gaps"
              value={dash.kpis.criticalGaps === null ? "—" : dash.kpis.criticalGaps}
              icon={AlertTriangle}
              accent="navy"
            />
          </div>

          <WidgetGrid>
            <Widget
              title="Team Development Status"
              info="Manager ratings submitted vs total direct reports."
            >
              <div className="py-3">
                <CompletionPie
                  completed={dash.kpis.ratingsComplete}
                  total={dash.kpis.ratingsTotal}
                  completedLabel="Rated"
                  remainingLabel="Pending"
                  size={150}
                />
              </div>
            </Widget>

            <Widget
              title="Pending Ratings"
              subtitle={`${pending.length} to do`}
              className="xl:col-span-2"
              noPadding
              empty={pending.length === 0}
              emptyText="All ratings complete. 🎉"
            >
              <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-surface-sunken text-left text-xs uppercase tracking-wide text-text-tertiary">
                  <tr>
                    <th scope="col" className="px-5 py-3">Employee</th>
                    <th scope="col" className="px-5 py-3">Role</th>
                    <th scope="col" className="px-5 py-3">Days left</th>
                    <th scope="col" className="px-5 py-3">Status</th>
                    <th scope="col" className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pending.map((m) => (
                    <tr key={m.assessmentId}>
                      <td className="px-5 py-3">
                        <div className="font-medium text-text-primary">
                          {m.employeeName}
                        </div>
                        <div className="text-xs text-text-tertiary">{m.division}</div>
                      </td>
                      <td className="px-5 py-3 text-text-secondary">{m.roleName}</td>
                      <td className="px-5 py-3 text-text-secondary">
                        {m.daysLeft === null
                          ? "—"
                          : m.daysLeft < 0
                            ? "Overdue"
                            : `${m.daysLeft} day${m.daysLeft === 1 ? "" : "s"}`}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[m.status] ?? ""}`}
                        >
                          {STATUS_LABEL[m.status] ?? m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/rate/${m.assessmentId}`}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
                        >
                          {m.status === "in_progress" ? "Continue" : "Rate"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Widget>

            <Widget
              title="Team Competency Heatmap"
              info="Average gap per competency area, by team member. Colored by traffic-light status."
              className="xl:col-span-3"
              noPadding
              empty={!dash.heatmap.resultsAvailable}
              emptyText="The heatmap fills in once self and manager assessments are submitted and calibrated."
            >
              <div className="overflow-x-auto p-4">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-tertiary">
                      <th className="px-3 py-2">Employee</th>
                      {dash.heatmap.areas.map((a) => (
                        <th key={a.code} className="px-2 py-2 text-center" title={a.name}>
                          {a.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dash.heatmap.rows.map((row) => (
                      <tr key={row.employeeName}>
                        <td className="px-3 py-2 font-medium text-text-primary">
                          {row.employeeName}
                        </td>
                        {row.cells.map((cell, i) => (
                          <td key={i} className="p-1 text-center">
                            {cell ? (
                              <span
                                className="inline-block w-12 rounded-md px-2 py-1 text-xs font-bold"
                                style={{
                                  backgroundColor: `${trafficColor(cell.trafficLight)}26`,
                                  color: trafficColor(cell.trafficLight),
                                }}
                                title={`Avg gap ${cell.gap} · L${cell.managerLevel}`}
                              >
                                {cell.gap > 0 ? "+" : ""}
                                {cell.gap}
                              </span>
                            ) : (
                              <span className="text-text-tertiary">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Widget>
          </WidgetGrid>
        </>
      )}
    </div>
  );
}
