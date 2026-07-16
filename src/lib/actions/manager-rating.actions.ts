"use server";

import { ObjectId } from "mongodb";
import { requireSession } from "@/lib/auth/session";
import { assessmentService } from "@/lib/services/assessment.service";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

async function actorCtx() {
  const session = await requireSession();
  return {
    actorId: new ObjectId(session.user.id),
    isHrAdmin: session.user.roles.includes("hr_admin"),
  };
}

type ActionResult =
  | { success: true; progress?: number }
  | { success: false; error: string };

export async function saveRatingAction(
  assessmentId: string,
  subCompetencyId: string,
  rating: number,
  evidence: string | null,
): Promise<ActionResult> {
  try {
    const ctx = await actorCtx();
    const res = await assessmentService.saveManagerRating(
      new ObjectId(assessmentId),
      { subCompetencyId: new ObjectId(subCompetencyId), rating, evidence },
      ctx,
    );
    return { success: true, progress: res.progress };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "saveRatingAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

export async function submitManagerAction(
  assessmentId: string,
): Promise<ActionResult> {
  try {
    const ctx = await actorCtx();
    await assessmentService.submitManager(new ObjectId(assessmentId), ctx);
    return { success: true };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "submitManagerAction failed");
    return { success: false, error: "Something went wrong" };
  }
}
