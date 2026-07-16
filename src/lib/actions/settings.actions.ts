"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { settingsService } from "@/lib/services/settings.service";
import { thresholdsSchema } from "@/lib/domain/validation/settings.schema";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export interface ThresholdsFormValues {
  gap: { strongMax: number; developingMax: number; needsFocusMax: number };
  calibration: { alignedMax: number; minorMax: number };
}

type Result = { success: true } | { success: false; error: string };

export async function updateThresholdsAction(
  values: ThresholdsFormValues,
): Promise<Result> {
  try {
    const session = await requirePermission("settings.manage");
    const parsed = thresholdsSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid thresholds",
      };
    }
    await settingsService.updateThresholds(
      parsed.data,
      new ObjectId(session.user.id),
    );
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "updateThresholdsAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

export async function resetThresholdsAction(): Promise<Result> {
  try {
    const session = await requirePermission("settings.manage");
    await settingsService.resetThresholds(new ObjectId(session.user.id));
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "resetThresholdsAction failed");
    return { success: false, error: "Something went wrong" };
  }
}
