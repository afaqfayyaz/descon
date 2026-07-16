import { ObjectId } from "mongodb";
import { requirePermission } from "@/lib/auth/permissions";
import { resultsService } from "@/lib/services/results.service";
import { KpiCard } from "@/components/shared/kpi-card";
import { TrafficLight } from "@/components/shared/traffic-light";
import { PrintButton } from "@/components/shared/print-button";
import { DonutStat } from "@/components/charts/donut-stat";
import { ProficiencyBar } from "@/components/shared/proficiency-bar";

function fmt(n: number | null): string {
  return n === null ? "—" : String(n);
}

export default async function ResultDetailPage({
  params,
}: {
  params: { assessmentId: string };
}) {
  await requirePermission("assessment.view.all");
  const view = await resultsService.getAssessmentResultView(
    new ObjectId(params.assessmentId),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {view.employee.name}
          </h1>
          <p className="text-sm text-slate-500">
            {view.employee.division} · {view.finalStatus.replace("_", " ")}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <a
            href={`/api/results/${params.assessmentId}/export`}
            className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </a>
          <PrintButton />
        </div>
      </div>

      {view.isPreview && (
        <div className="rounded-lg border border-gap-developing/30 bg-gap-developing/10 px-4 py-3 text-sm text-gap-developing">
          Awaiting manager rating — the numbers below are a live preview from
          the employee&apos;s self-assessment only. They&apos;ll be replaced by
          the official scored result once the manager rates.
        </div>
      )}

      {view.overall && (
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="flex items-center justify-center rounded-lg border border-border bg-surface p-5 shadow-card">
            <DonutStat
              value={view.overall.capabilityPercent}
              label={view.isPreview ? "Self capability (preview)" : "Capability"}
              size={130}
            />
          </div>
          <KpiCard
            label={view.isPreview ? "Self level" : "Manager level"}
            value={`${view.overall.managerLevel} / 5`}
            hint="Average across areas"
          />
          <KpiCard label="Required level" value={view.overall.requiredLevel} />
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">
              {view.isPreview ? "Self gap & status (preview)" : "Overall gap & status"}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {view.overall.gap}
            </div>
            <div className="mt-2">
              <TrafficLight status={view.overall.trafficLight} />
            </div>
          </div>
        </div>
      )}

      {view.areas.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 bg-slate-50 px-5 py-3 font-semibold text-slate-900">
            By competency area{view.isPreview ? " (self preview)" : ""}
          </header>
          <div className="divide-y divide-slate-100">
            {view.areas.map((a) => (
              <div key={a.areaName} className="px-5 py-3">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-800">
                    {a.areaName}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      L{a.managerLevel} / req {a.requiredLevel}
                    </span>
                    <TrafficLight status={a.trafficLight} />
                  </span>
                </div>
                <ProficiencyBar
                  current={a.managerLevel}
                  required={a.requiredLevel}
                  trafficLight={a.trafficLight}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-200 bg-slate-50 px-5 py-3 font-semibold text-slate-900">
          Sub-competency detail
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Sub-Competency</th>
              <th className="px-3 py-2 text-center font-medium">Self</th>
              <th className="px-3 py-2 text-center font-medium">Mgr</th>
              <th className="px-3 py-2 text-center font-medium">Req</th>
              <th className="px-3 py-2 text-center font-medium">Gap</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-center font-medium">Self−Mgr</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => (
              <tr
                key={r.subCode}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-5 py-2 font-medium text-slate-500">
                  {r.subCode}
                </td>
                <td className="px-3 py-2 text-slate-800">{r.subName}</td>
                <td className="px-3 py-2 text-center">{fmt(r.selfLevel)}</td>
                <td className="px-3 py-2 text-center">{fmt(r.managerLevel)}</td>
                <td className="px-3 py-2 text-center">{fmt(r.requiredLevel)}</td>
                <td className="px-3 py-2 text-center">{fmt(r.gap)}</td>
                <td className="px-3 py-2">
                  {r.trafficLight && <TrafficLight status={r.trafficLight} />}
                </td>
                <td className="px-3 py-2 text-center text-slate-500">
                  {fmt(r.difference)}
                  {r.calibrationFlag && r.calibrationFlag !== "none" && (
                    <span className="ml-1 text-xs text-gap-focus">⚑</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
