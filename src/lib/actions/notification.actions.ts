"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { currentUserId } from "@/lib/auth/session";
import { notificationService } from "@/lib/services/notification.service";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

type Result = { success: true } | { success: false; error: string };

export async function markNotificationReadAction(id: string): Promise<Result> {
  try {
    const userId = await currentUserId();
    await notificationService.markRead(new ObjectId(id), userId);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    logger.error({ error }, "markNotificationReadAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

export async function markAllNotificationsReadAction(): Promise<Result> {
  try {
    const userId = await currentUserId();
    await notificationService.markAllRead(userId);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    logger.error({ error }, "markAllNotificationsReadAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

export async function runRemindersAction(): Promise<
  { success: true; created: number } | { success: false; error: string }
> {
  try {
    await requirePermission("notification.send");
    const { created } = await notificationService.generateReminders();
    revalidatePath("/");
    return { success: true, created };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "runRemindersAction failed");
    return { success: false, error: "Something went wrong" };
  }
}
