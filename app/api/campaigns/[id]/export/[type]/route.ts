import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { exportService, type CsvFile } from "@/lib/services/export.service";
import { auditService } from "@/lib/services/audit.service";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

const TYPES = ["results", "heatmap", "calibration"] as const;
type ExportType = (typeof TYPES)[number];

export async function GET(
  _req: Request,
  { params }: { params: { id: string; type: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasPermission(session.user.roles, "report.export")) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!ObjectId.isValid(params.id) || !TYPES.includes(params.type as ExportType)) {
    return new Response("Not found", { status: 404 });
  }

  const campaignId = new ObjectId(params.id);
  try {
    let file: CsvFile;
    switch (params.type as ExportType) {
      case "results":
        file = await exportService.campaignResultsCsv(campaignId);
        break;
      case "heatmap":
        file = await exportService.heatmapCsv(campaignId);
        break;
      case "calibration":
        file = await exportService.calibrationCsv(campaignId);
        break;
    }
    await auditService.log({
      actorId: new ObjectId(session.user.id),
      actorEmail: session.user.email,
      action: "report.exported",
      entityType: "AssessmentCampaign",
      entityId: campaignId,
      after: { type: params.type },
    });
    return new Response(file.content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return new Response(error.message, { status: error.statusCode });
    }
    logger.error({ error }, "campaign export failed");
    return new Response("Export failed", { status: 500 });
  }
}
