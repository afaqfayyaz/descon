import Link from "next/link";
import { FileText, FileSpreadsheet } from "lucide-react";

import { requirePermission } from "@/lib/auth/permissions";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { REPORT_TEMPLATES } from "@/lib/services/report.service";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  in_calibration: "In calibration",
  locked: "Locked",
  archived: "Archived",
};

export default async function ReportsPage() {
  await requirePermission("report.org");
  const campaigns = await campaignRepo.findAll();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reports Library</h1>
        <p className="text-sm text-text-secondary">
          Eight standard report templates per campaign. Export to Excel, or open
          a print-ready view to save as PDF.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-text-secondary">
          No campaigns yet. Launch a campaign to generate reports.
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const id = c._id.toString();
            return (
              <div
                key={id}
                className="rounded-lg border border-border bg-surface p-5"
              >
                <div className="mb-4">
                  <h2 className="font-semibold text-text-primary">{c.name}</h2>
                  <p className="text-xs text-text-tertiary">
                    {STATUS_LABELS[c.status] ?? c.status} ·{" "}
                    {c.stats.totalParticipants} participants
                  </p>
                </div>
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {REPORT_TEMPLATES.map((t) => (
                        <tr key={t.key} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-text-primary">
                            {t.title}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/reports/${id}/${t.key}`}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-primary hover:text-primary"
                              >
                                <FileText className="h-3.5 w-3.5" /> PDF
                              </Link>
                              <a
                                href={`/api/reports/${id}/${t.key}`}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-primary hover:text-primary"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
