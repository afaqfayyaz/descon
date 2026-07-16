import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { DIRECT_ASSIGNMENT_DESCRIPTION } from "@/lib/services/campaign.service";
import { SendRemindersButton } from "@/components/features/notifications/send-reminders-button";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-info/10 text-info",
  in_calibration: "bg-gap-developing/10 text-gap-developing",
  locked: "bg-gap-strong/10 text-gap-strong",
  archived: "bg-slate-100 text-slate-400",
};

const STATUSES = ["draft", "active", "in_calibration", "locked"] as const;

/** e.g. Date -> "2026-07" (used as the month bucket key). */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { period?: string; status?: string };
}) {
  await requirePermission("campaign.view");
  // One-on-one direct assignments are listed on the Assessments hub instead.
  const all = (await campaignRepo.findAll()).filter(
    (c) => c.description !== DIRECT_ASSIGNMENT_DESCRIPTION,
  );

  // Distinct months from campaign start dates (newest first).
  const months = [...new Set(all.map((c) => monthKey(new Date(c.startDate))))]
    .sort()
    .reverse();

  const period = searchParams.period ?? "";
  const status = searchParams.status ?? "";
  const campaigns = all.filter((c) => {
    if (period && monthKey(new Date(c.startDate)) !== period) return false;
    if (status && c.status !== status) return false;
    return true;
  });

  const selectCls =
    "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
        <div className="flex items-center gap-3">
          <SendRemindersButton />
          <Link
            href="/campaigns/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            New campaign
          </Link>
        </div>
      </div>

      {/* Filters (native GET form — works without client JS) */}
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Month
          <select name="period" defaultValue={period} className={selectCls}>
            <option value="">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Status
          <select name="status" defaultValue={status} className={selectCls}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Apply
        </button>
        {(period || status) && (
          <Link
            href="/campaigns"
            className="px-2 py-1.5 text-sm text-slate-500 hover:text-primary"
          >
            Clear
          </Link>
        )}
        <span className="ml-auto self-center text-sm text-slate-400">
          {campaigns.length} of {all.length} campaign
          {all.length === 1 ? "" : "s"}
        </span>
      </form>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {all.length === 0 ? (
            <>
              No campaigns yet. Create your first one or run{" "}
              <code>npm run cycle</code> to generate a demo campaign.
            </>
          ) : (
            "No campaigns match the selected filters."
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Campaign</th>
                <th className="px-3 py-3 font-medium">Started</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 text-center font-medium">Participants</th>
                <th className="px-3 py-3 text-center font-medium">Self done</th>
                <th className="px-3 py-3 text-center font-medium">Mgr done</th>
                <th className="px-3 py-3 text-center font-medium">Outliers</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c._id.toString()}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/campaigns/${c._id.toString()}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {new Date(c.startDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[c.status] ?? STATUS_STYLES.draft
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {c.stats.totalParticipants}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {c.stats.selfCompleted}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {c.stats.managerCompleted}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {c.stats.calibrationOutliers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
