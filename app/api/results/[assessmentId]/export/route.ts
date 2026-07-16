import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { exportService } from "@/lib/services/export.service";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function GET(
  _req: Request,
  { params }: { params: { assessmentId: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasPermission(session.user.roles, "report.export")) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!ObjectId.isValid(params.assessmentId)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await exportService.assessmentResultCsv(
      new ObjectId(params.assessmentId),
    );
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
    logger.error({ error }, "result export failed");
    return new Response("Export failed", { status: 500 });
  }
}
