import Link from "next/link";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requirePermission } from "@/lib/auth/permissions";
import { resultsService } from "@/lib/services/results.service";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { KpiCard } from "@/components/shared/kpi-card";
import { TrafficLight } from "@/components/shared/traffic-light";
import { Widget } from "@/components/dashboard/widget";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { DonutStat } from "@/components/charts/donut-stat";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { RadarGapChart } from "@/components/charts/radar-gap-chart";
import {
  ProficiencyMatrix,
  type MatrixRow,
} from "@/components/charts/proficiency-matrix";
import { trafficColor } from "@/components/charts/chart-theme";
import { Send } from "lucide-react";
import { EmployeeHistory } from "@/components/features/employees/employee-history";

const STATUS_LABEL: Record<string, string> = {
  not_assigned: "Not assigned",
  sent: "Awaiting self-assessment",
  self_done: "Awaiting manager rating",
  scored: "Scored",
  finalized: "Finalized",
};

function fmt(n: number | null): string {
  return n === null ? "—" : String(n);
}

export default async function EmployeeDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("user.manage");
  if (!ObjectId.isValid(params.id)) notFound();
  const employeeId = new ObjectId(params.id);

  const emp = await userRepo.findById(employeeId);
  if (!emp) notFound();

  const [latest, manager, role, history] = await Promise.all([
    resultsService.getEmployeeLatestResultView(employeeId),
    emp.lineManagerId ? userRepo.findById(emp.lineManagerId) : Promise.resolve(null),
    roleRepo.findById(emp.designation),
    resultsService.getEmployeeHistory(employeeId),
  ]);
  const view = latest.view;

  // Build the proficiency matrix (areas → sub-competencies) from the view.
  const matrixRows: MatrixRow[] = view
    ? view.areas.map((area) => {
        const subRows: MatrixRow[] = view.rows
          .filter((r) => r.areaName === area.areaName)
          .map((r) => ({
            code: r.subCode,
            name: r.subName,
            current: r.managerLevel,
            required: r.requiredLevel,
            gap: r.gap,
            trafficLight: r.trafficLight,
          }));
        return {
          code: "",
          name: area.areaName,
          current: area.managerLevel,
          required: area.requiredLevel,
          gap: area.gap,
          trafficLight: area.trafficLight,
          subRows,
        };
      })
    : [];

  const areaGapBars = view
    ? view.areas.map((a) => ({
        label: a.areaName,
        value: a.gap,
        color: trafficColor(a.trafficLight),
      }))
    : [];

  const radarData = view
    ? view.areas.map((a) => ({
        area: a.areaName,
        manager: a.managerLevel,
        required: a.requiredLevel,
      }))
    : [];

  return (
    <div className="space-y-6">
      <Link
        href="/employees"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {emp.fullName}
          </h1>
          <p className="text-sm text-text-secondary">
            {role?.name ?? "—"} · {emp.division}
            {emp.department ? ` · ${emp.department}` : ""} · Manager:{" "}
            {manager?.fullName ?? "—"}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            {STATUS_LABEL[latest.status] ?? latest.status}
          </p>
        </div>
        <Link
          href="/assessment"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <Send className="h-4 w-4" /> Send assessment
        </Link>
      </div>

      {!view ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-text-secondary">
          {latest.status === "not_assigned"
            ? "No assessment assigned yet. Send one from the Assessments page."
            : latest.status === "sent"
              ? "Waiting for the employee to complete their self-assessment."
              : "Waiting for the line manager to submit their ratings. Results appear once both sides are in."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Capability"
              value={view.overall ? `${view.overall.capabilityPercent}%` : "—"}
              hint="manager vs required"
              accent="navy"
            />
            <KpiCard
              label="Manager level"
              value={view.overall ? `${view.overall.managerLevel} / 5` : "—"}
              accent="blue"
            />
            <KpiCard
              label="Required level"
              value={view.overall ? view.overall.requiredLevel : "—"}
              accent="neutral"
            />
            <KpiCard
              label="Overall gap"
              value={
                view.overall
                  ? `${view.overall.gap > 0 ? "+" : ""}${view.overall.gap}`
                  : "—"
              }
              accent="navy"
            />
          </div>

          <WidgetGrid>
            <Widget title="Overall Capability" info="Manager-rated level vs required, across all areas.">
              <div className="flex flex-col items-center gap-3 py-2">
                <DonutStat
                  value={view.overall?.capabilityPercent ?? 0}
                  label="Capability"
                />
                {view.overall && <TrafficLight status={view.overall.trafficLight} />}
              </div>
            </Widget>

            <Widget
              title="Competency Radar"
              info="Manager-rated level vs required across all competency areas (0–5)."
              empty={radarData.length === 0}
            >
              <RadarGapChart data={radarData} />
            </Widget>

            <Widget
              title="Gap by Competency Area"
              info="Required minus manager level per area. Colored by traffic light."
              className="md:col-span-2 xl:col-span-3"
              empty={areaGapBars.length === 0}
            >
              <HorizontalBarChart data={areaGapBars} format="gap" />
            </Widget>
          </WidgetGrid>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Proficiency by area &amp; sub-competency
            </h2>
            <ProficiencyMatrix rows={matrixRows} />
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
            <header className="border-b border-border bg-surface-sunken px-5 py-3 text-sm font-semibold text-text-primary">
              Sub-competency detail
            </header>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-tertiary">
                  <th className="px-5 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Sub-Competency</th>
                  <th className="px-3 py-2 text-center font-medium">Self</th>
                  <th className="px-3 py-2 text-center font-medium">Mgr</th>
                  <th className="px-3 py-2 text-center font-medium">Req</th>
                  <th className="px-3 py-2 text-center font-medium">Gap</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((r) => (
                  <tr
                    key={r.subCode}
                    className="border-b border-border last:border-0 hover:bg-surface-sunken"
                  >
                    <td className="px-5 py-2 font-medium text-text-tertiary">
                      {r.subCode}
                    </td>
                    <td className="px-3 py-2 text-text-primary">{r.subName}</td>
                    <td className="px-3 py-2 text-center">{fmt(r.selfLevel)}</td>
                    <td className="px-3 py-2 text-center">{fmt(r.managerLevel)}</td>
                    <td className="px-3 py-2 text-center">{fmt(r.requiredLevel)}</td>
                    <td className="px-3 py-2 text-center">{fmt(r.gap)}</td>
                    <td className="px-3 py-2">
                      {r.trafficLight && <TrafficLight status={r.trafficLight} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {history.length > 0 && <EmployeeHistory entries={history} />}
    </div>
  );
}
