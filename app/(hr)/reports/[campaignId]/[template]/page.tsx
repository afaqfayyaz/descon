import Link from "next/link";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { reportService, isReportKey } from "@/lib/services/report.service";
import { PrintButton } from "@/components/shared/print-button";

export default async function ReportPrintPage({
  params,
}: {
  params: { campaignId: string; template: string };
}) {
  await requirePermission("report.org");
  if (!ObjectId.isValid(params.campaignId) || !isReportKey(params.template)) {
    notFound();
  }
  const table = await reportService.build(
    new ObjectId(params.campaignId),
    params.template,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="no-print flex items-center justify-between">
        <Link
          href="/reports"
          className="text-sm text-text-secondary hover:text-primary"
        >
          ← Reports
        </Link>
        <div className="flex gap-2">
          <a
            href={`/api/reports/${params.campaignId}/${params.template}`}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary hover:bg-slate-50"
          >
            Export Excel
          </a>
          <PrintButton label="Save as PDF" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 print-break">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
          Caliber
        </div>
        <h1 className="text-2xl font-bold text-text-primary">{table.title}</h1>
        <p className="text-sm text-text-secondary">
          {table.campaignName} ·{" "}
          {table.generatedAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        {table.note && (
          <p className="mt-1 text-xs text-text-tertiary">{table.note}</p>
        )}

        <div className="mt-5 overflow-x-auto">
          {table.rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-tertiary">
              No data yet for this report. It fills in once assessments are
              submitted and results are computed.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-border text-left text-xs uppercase tracking-wide text-text-tertiary">
                  {table.headers.map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-text-secondary">
                        {cell === null || cell === undefined ? "—" : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
