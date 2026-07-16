"use server";

import { ObjectId } from "mongodb";
import { assessmentService } from "@/lib/services/assessment.service";
import { tokenService } from "@/lib/services/token.service";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

type ActionResult =
  | { success: true; progress?: number }
  | { success: false; error: string };

const INVALID = "This link is no longer valid. Please request a new one.";

/** Resolve a token and assert it is for the expected side. */
async function resolveFor(token: string, kind: "self" | "manager") {
  const res = await tokenService.resolveToken(token);
  if (res.status !== "ok" || res.kind !== kind) return null;
  return res.assessment;
}

export async function saveAnswerByTokenAction(
  token: string,
  questionId: string,
  questionVersion: number,
  selectedOption: string,
): Promise<ActionResult> {
  try {
    const assessment = await resolveFor(token, "self");
    if (!assessment) return { success: false, error: INVALID };
    const res = await assessmentService.saveSelfAnswer(
      assessment._id,
      { questionId: new ObjectId(questionId), questionVersion, selectedOption },
      { actorId: assessment.employeeId },
    );
    return { success: true, progress: res.progress };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    logger.error({ error }, "saveAnswerByTokenAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

export async function submitSelfByTokenAction(
  token: string,
): Promise<ActionResult> {
  try {
    const assessment = await resolveFor(token, "self");
    if (!assessment) return { success: false, error: INVALID };
    await assessmentService.submitSelf(assessment._id, {
      actorId: assessment.employeeId,
    });
    await tokenService.consume(token);
    // Notify the line manager with their own secure scoring link.
    await assessmentService.triggerManagerScoring(assessment);
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    logger.error({ error }, "submitSelfByTokenAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

export async function saveRatingByTokenAction(
  token: string,
  subCompetencyId: string,
  rating: number,
  evidence: string | null,
): Promise<ActionResult> {
  try {
    const assessment = await resolveFor(token, "manager");
    if (!assessment) return { success: false, error: INVALID };
    if (!assessment.lineManagerId)
      return { success: false, error: INVALID };
    const res = await assessmentService.saveManagerRating(
      assessment._id,
      { subCompetencyId: new ObjectId(subCompetencyId), rating, evidence },
      { actorId: assessment.lineManagerId },
    );
    return { success: true, progress: res.progress };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    logger.error({ error }, "saveRatingByTokenAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

export async function submitManagerByTokenAction(
  token: string,
): Promise<ActionResult> {
  try {
    const assessment = await resolveFor(token, "manager");
    if (!assessment) return { success: false, error: INVALID };
    if (!assessment.lineManagerId)
      return { success: false, error: INVALID };
    await assessmentService.submitManager(assessment._id, {
      actorId: assessment.lineManagerId,
    });
    await tokenService.consume(token);
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    logger.error({ error }, "submitManagerByTokenAction failed");
    return { success: false, error: "Something went wrong" };
  }
}
