import { notificationService } from "@/lib/services/notification.service";
import { logger } from "@/lib/utils/logger";

/**
 * Deadline-reminder cron endpoint. Intended to be hit daily by an external
 * scheduler (e.g. Vercel Cron) with an Authorization: Bearer <CRON_SECRET>
 * header. Disabled (503) when CRON_SECRET is not configured.
 */
async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response("Cron disabled (set CRON_SECRET)", { status: 503 });
  }

  const auth = req.headers.get("authorization");
  const headerSecret =
    req.headers.get("x-cron-secret") ??
    (auth?.startsWith("Bearer ") ? auth.slice(7) : null);
  if (headerSecret !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await notificationService.generateReminders();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    logger.error({ error }, "reminder cron failed");
    return new Response("Reminder generation failed", { status: 500 });
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
