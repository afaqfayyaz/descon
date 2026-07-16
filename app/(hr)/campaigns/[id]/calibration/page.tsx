import Link from "next/link";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { analyticsService } from "@/lib/services/analytics.service";
import { KpiCard } from "@/components/shared/kpi-card";
import { OutlierRow } from "@/components/features/analytics/outlier-row";
import { AppError } from "@/lib/utils/errors";

export default async function CalibrationPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("report.org");
  if (!ObjectId.isValid(params.id)) notFound();

  try {
    const data = await analyticsService.getCalibrationOutliers(
      new ObjectId(params.id),
    );
    const editable = data.status === "in_calibration";
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/campaigns/${params.id}`}
              className="text-sm text-slate-500 hover:text-primary"
            >
              ← {data.campaignName}
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Calibration workshop
            </h1>
            <p className="text-sm text-slate-500">
              Sub-competencies where self and manager ratings diverge the most.
              Review these together to align scoring.
            </p>
          </div>
          <a
            href={`/api/campaigns/${params.id}/export/calibration`}
            className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </a>
        </div>

        {!editable && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {data.status === "locked"
              ? "This campaign is locked — adjustments are disabled."
              : "Move the campaign into the calibration phase (from its detail page) to apply adjustments."}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Total outliers" value={data.total} />
          <KpiCard label="Major (|diff| > 2)" value={data.major} />
          <KpiCard label="Minor (1 < |diff| ≤ 2)" value={data.minor} />
        </div>

        {data.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No calibration outliers — self and manager ratings are well aligned,
            or results haven&apos;t been computed yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-3 py-3 font-medium">Sub-competency</th>
                  <th className="px-3 py-3 text-center font-medium">Self</th>
                  <th className="px-3 py-3 text-center font-medium">Manager</th>
                  <th className="px-3 py-3 text-center font-medium">Diff</th>
                  <th className="px-3 py-3 font-medium">Flag</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <OutlierRow
                    key={`${r.assessmentId}-${r.subCode}-${i}`}
                    campaignId={params.id}
                    subCompetencyId={r.subCompetencyId}
                    row={r}
                    editable={editable}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  } catch (error) {
    if (error instanceof AppError) notFound();
    throw error;
  }
}
