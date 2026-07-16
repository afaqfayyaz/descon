"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/permissions";
import { assessmentService } from "@/lib/services/assessment.service";
import { campaignScopeSchema } from "@/lib/domain/validation/campaign.schema";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import type { Session } from "next-auth";

type Result = { success: true } | { success: false; error: string };

function actorFrom(session: Session) {
  return { id: new ObjectId(session.user.id), email: session.user.email };
}

function fail(error: unknown, where: string): { success: false; error: string } {
  if (error instanceof AppError) return { success: false, error: error.message };
  logger.error({ error }, `${where} failed`);
  return { success: false, error: "Something went wrong" };
}

/**
 * Send a one-on-one assessment to a single employee from the Assessments hub.
 * Optionally scoped to a custom question selection (defaults to the full
 * framework). Creates the one-participant campaign + passwordless self link.
 */
export async function assignAssessmentAction(
  employeeId: string,
  scope?: unknown,
): Promise<Result> {
  try {
    const session = await requirePermission("user.manage");
    const parsedScope =
      scope === undefined ? undefined : campaignScopeSchema.parse(scope);
    await assessmentService.assignToEmployee(
      new ObjectId(employeeId),
      actorFrom(session),
      parsedScope,
    );
    revalidatePath("/assessment");
    revalidatePath(`/employees/${employeeId}`);
    return { success: true };
  } catch (error) {
    return fail(error, "assignAssessmentAction");
  }
}

/** Re-issue and email the secure self link for an existing assessment. */
export async function resendSelfLinkAction(
  assessmentId: string,
): Promise<Result> {
  try {
    const session = await requirePermission("user.manage");
    await assessmentService.resendSelfLink(
      new ObjectId(assessmentId),
      new ObjectId(session.user.id),
    );
    return { success: true };
  } catch (error) {
    return fail(error, "resendSelfLinkAction");
  }
}

/**
 * (Re)issue and email the rater's secure scoring link for an assessment whose
 * self-side is already submitted. HR picks the rater at send time — passing
 * `raterId` reassigns the assessment to that person before sending.
 */
export async function resendManagerLinkAction(
  assessmentId: string,
  raterId?: string,
): Promise<Result> {
  try {
    await requirePermission("user.manage");
    await assessmentService.resendManagerLink(
      new ObjectId(assessmentId),
      raterId ? new ObjectId(raterId) : undefined,
    );
    revalidatePath("/assessment");
    return { success: true };
  } catch (error) {
    return fail(error, "resendManagerLinkAction");
  }
}
