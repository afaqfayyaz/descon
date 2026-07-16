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

export async function saveAnswerAction(
  assessmentId: string,
  questionId: string,
  questionVersion: number,
  selectedOption: string,
): Promise<ActionResult> {
  try {
    const ctx = await actorCtx();
    const res = await assessmentService.saveSelfAnswer(
      new ObjectId(assessmentId),
      { questionId: new ObjectId(questionId), questionVersion, selectedOption },
      ctx,
    );
    return { success: true, progress: res.progress };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "saveAnswerAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

export async function submitSelfAction(
  assessmentId: string,
): Promise<ActionResult> {
  try {
    const ctx = await actorCtx();
    await assessmentService.submitSelf(new ObjectId(assessmentId), ctx);
    return { success: true };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "submitSelfAction failed");
    return { success: false, error: "Something went wrong" };
  }
}
