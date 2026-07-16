import Link from "next/link";
import { ObjectId } from "mongodb";
import { requirePermission } from "@/lib/auth/permissions";
import { resultsService } from "@/lib/services/results.service";
import { analyticsService } from "@/lib/services/analytics.service";
import { KpiCard } from "@/components/shared/kpi-card";
import { LaunchButton } from "@/components/features/campaigns/launch-button";
import { CampaignStateActions } from "@/components/features/campaigns/campaign-state-actions";
import { CampaignCharts } from "@/components/features/campaigns/campaign-charts";
import { SendRemindersButton } from "@/components/features/notifications/send-reminders-button";
import { ExtendDeadline } from "@/components/features/campaigns/extend-deadline";

const TL_STYLES: Record<string, string> = {
  strong: "bg-gap-strong/10 text-gap-strong",
  developing: "bg-gap-developing/10 text-gap-developing",
  needs_focus: "bg-gap-focus/10 text-gap-focus",
  critical: "bg-gap-critical/10 text-gap-critical",
};

/** yyyy-mm-dd for <input type="date"> */
function toDateInput(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

const SIDE_STYLES: Record<string, string> = {
  submitted: "bg-gap-strong/10 text-gap-strong",
  in_progress: "bg-gap-developing/10 text-gap-developing",
  not_started: "bg-slate-100 text-slate-500",
};

function Pill({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        SIDE_STYLES[value] ?? SIDE_STYLES.not_started
      }`}
    >
      {value.replace("_", " ")}
    </span>
  );
}

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("campaign.view");
  const campaignId = new ObjectId(params.id);
  const { campaign, participants } = await resultsService.getCampaignOverview(
    campaignId,
  );
  const dashboard =
    campaign.status !== "draft"
      ? await analyticsService.getCampaignDashboard(campaignId)
      : null;

  // FR-CMP-003 monitoring metrics.
  const now = new Date();
  const complete = participants.filter(
    (p) => p.selfStatus === "submitted" && p.managerStatus === "submitted",
  ).length;
  const overdue =
    campaign.managerAssessmentDeadline &&
    new Date(campaign.managerAssessmentDeadline) < now
      ? participants.filter(
          (p) =>
            !(p.selfStatus === "submitted" && p.managerStatus === "submitted"),
        ).length
      : 0;
  const isActive = campaign.status === "active";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/campaigns"
            className="text-sm text-slate-500 hover:text-primary"
          >
            ← Campaigns
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {campaign.name}
          </h1>
          <p className="text-sm text-slate-500">Status: {campaign.status}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {campaign.status === "draft" ? (
            <LaunchButton campaignId={campaign._id.toString()} />
          ) : (
            <>
              <div className="flex gap-2">
                <Link
                  href={`/campaigns/${campaign._id.toString()}/heatmap`}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Heatmap
                </Link>
                <Link
                  href={`/campaigns/${campaign._id.toString()}/calibration`}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Calibration
                </Link>
                <a
                  href={`/api/campaigns/${campaign._id.toString()}/export/results`}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Export CSV
                </a>
              </div>
              {isActive && (
                <div className="flex gap-2">
                  <SendRemindersButton />
                  <ExtendDeadline
                    campaignId={campaign._id.toString()}
                    selfDeadline={toDateInput(campaign.selfAssessmentDeadline)}
                    managerDeadline={toDateInput(
                      campaign.managerAssessmentDeadline,
                    )}
                  />
                </div>
              )}
              <CampaignStateActions
                campaignId={campaign._id.toString()}
                status={campaign.status}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Invited" value={campaign.stats.totalParticipants} />
        <KpiCard label="Self submitted" value={campaign.stats.selfCompleted} />
        <KpiCard
          label="Manager submitted"
          value={campaign.stats.managerCompleted}
        />
        <KpiCard label="Complete" value={complete} />
        <KpiCard label="Overdue" value={overdue} />
      </div>

      {dashboard && dashboard.resultsAvailable && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Performance dashboard
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Avg required"
              value={dashboard.kpis.avgRequired.toFixed(1)}
            />
            <KpiCard
              label="Avg current"
              value={dashboard.kpis.avgCurrent.toFixed(1)}
            />
            <KpiCard label="Avg gap" value={dashboard.kpis.avgGap.toFixed(1)} />
            <KpiCard
              label="Capability"
              value={`${dashboard.kpis.capabilityPercent}%`}
            />
          </div>

          <CampaignCharts
            areaRadar={dashboard.areaRadar}
            areaGaps={dashboard.areaGaps}
            distribution={dashboard.distribution}
            byDivision={dashboard.byDivision}
            byDesignation={dashboard.byDesignation}
          />

          {dashboard.employees.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <header className="border-b border-slate-200 bg-slate-50 px-5 py-3 font-semibold text-slate-900">
                Employee ratings
              </header>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2 font-medium">Employee</th>
                    <th className="px-3 py-2 font-medium">Division</th>
                    <th className="px-3 py-2 font-medium">Designation</th>
                    <th className="px-3 py-2 text-center font-medium">Required</th>
                    <th className="px-3 py-2 text-center font-medium">Current</th>
                    <th className="px-3 py-2 text-center font-medium">Gap</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.employees.map((e) => (
                    <tr
                      key={e.employeeId}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-2 font-medium text-slate-800">
                        {e.name}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{e.division}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {e.designation}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">
                        {e.required.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">
                        {e.current.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-slate-800">
                        {e.gap.toFixed(1)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            TL_STYLES[e.trafficLight] ?? TL_STYLES.developing
                          }`}
                        >
                          {e.trafficLight.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {e.assessmentId && (
                          <Link
                            href={`/results/${e.assessmentId}`}
                            className="text-sm text-primary hover:underline"
                          >
                            View →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-200 bg-slate-50 px-5 py-3 font-semibold text-slate-900">
          Participants
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2 font-medium">Employee</th>
              <th className="px-3 py-2 font-medium">Division</th>
              <th className="px-3 py-2 font-medium">Self</th>
              <th className="px-3 py-2 font-medium">Manager</th>
              <th className="px-3 py-2 font-medium">Final</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-sm text-slate-500"
                >
                  {campaign.status === "draft"
                    ? `${campaign.stats.totalParticipants} participant(s) targeted. Launch the campaign to create their assessments.`
                    : "No participants."}
                </td>
              </tr>
            )}
            {participants.map((p) => (
              <tr
                key={p.assessmentId}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-5 py-2 font-medium text-slate-800">
                  {p.name}
                </td>
                <td className="px-3 py-2 text-slate-600">{p.division}</td>
                <td className="px-3 py-2">
                  <Pill value={p.selfStatus} />
                </td>
                <td className="px-3 py-2">
                  <Pill value={p.managerStatus} />
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {p.finalStatus.replace("_", " ")}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/results/${p.assessmentId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View results →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
