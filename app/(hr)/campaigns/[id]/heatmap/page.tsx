import Link from "next/link";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { analyticsService } from "@/lib/services/analytics.service";
import { Heatmap } from "@/components/features/analytics/heatmap";
import { PrintButton } from "@/components/shared/print-button";
import { AppError } from "@/lib/utils/errors";

export default async function HeatmapPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("report.org");
  if (!ObjectId.isValid(params.id)) notFound();

  try {
    const data = await analyticsService.getCampaignHeatmap(
      new ObjectId(params.id),
    );
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
              Capability heatmap
            </h1>
            <p className="text-sm text-slate-500">
              Average competency gap by area and division. Lower (greener) is
              stronger.
            </p>
          </div>
          <div className="no-print flex gap-2">
            <a
              href={`/api/campaigns/${params.id}/export/heatmap`}
              className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </a>
            <PrintButton />
          </div>
        </div>
        <Heatmap data={data} />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError) notFound();
    throw error;
  }
}
