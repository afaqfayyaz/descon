"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { calibrationService } from "@/lib/services/calibration.service";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

type AdjustResult = { success: true } | { success: false; error: string };

export async function adjustRatingAction(
  campaignId: string,
  assessmentId: string,
  subCompetencyId: string,
  adjustedLevel: number,
  note: string | null,
): Promise<AdjustResult> {
  try {
    const session = await requirePermission("campaign.finalize");
    await calibrationService.adjustRating(
      new ObjectId(assessmentId),
      new ObjectId(subCompetencyId),
      adjustedLevel,
      note,
      new ObjectId(session.user.id),
    );
    revalidatePath(`/campaigns/${campaignId}/calibration`);
    revalidatePath(`/campaigns/${campaignId}/heatmap`);
    return { success: true };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "adjustRatingAction failed");
    return { success: false, error: "Something went wrong" };
  }
}
