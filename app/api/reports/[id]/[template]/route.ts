import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  reportService,
  isReportKey,
} from "@/lib/services/report.service";
import { auditService } from "@/lib/services/audit.service";
import { toCsv, slugify } from "@/lib/utils/csv";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function GET(
  _req: Request,
  { params }: { params: { id: string; template: string } },
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!hasPermission(session.user.roles, "report.export")) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!ObjectId.isValid(params.id) || !isReportKey(params.template)) {
    return new Response("Not found", { status: 404 });
  }

  const campaignId = new ObjectId(params.id);
  try {
    const table = await reportService.build(campaignId, params.template);
    const content = toCsv(table.headers, table.rows);
    const filename = `${slugify(table.campaignName)}-${params.template}.csv`;
    await auditService.log({
      actorId: new ObjectId(session.user.id),
      actorEmail: session.user.email,
      action: "report.exported",
      entityType: "AssessmentCampaign",
      entityId: campaignId,
      after: { template: params.template, format: "excel" },
    });
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return new Response(error.message, { status: error.statusCode });
    }
    logger.error({ error }, "report export failed");
    return new Response("Export failed", { status: 500 });
  }
}
