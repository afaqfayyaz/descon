"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/permissions";
import { trainingService } from "@/lib/services/training.service";
import {
  assignTrainingSchema,
  createTrainingSchema,
  updateAssignmentStatusSchema,
  updateTrainingSchema,
} from "@/lib/domain/validation/training.schema";
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

export async function createTrainingAction(input: unknown): Promise<Result> {
  try {
    const session = await requirePermission("training.manage");
    const data = createTrainingSchema.parse(input);
    await trainingService.create(data, actorFrom(session));
    revalidatePath("/trainings");
    return { success: true };
  } catch (error) {
    return fail(error, "createTrainingAction");
  }
}

export async function updateTrainingAction(
  id: string,
  input: unknown,
): Promise<Result> {
  try {
    const session = await requirePermission("training.manage");
    const data = updateTrainingSchema.parse(input);
    await trainingService.update(new ObjectId(id), data, actorFrom(session));
    revalidatePath("/trainings");
    return { success: true };
  } catch (error) {
    return fail(error, "updateTrainingAction");
  }
}

export async function archiveTrainingAction(id: string): Promise<Result> {
  try {
    const session = await requirePermission("training.manage");
    await trainingService.archive(new ObjectId(id), actorFrom(session));
    revalidatePath("/trainings");
    return { success: true };
  } catch (error) {
    return fail(error, "archiveTrainingAction");
  }
}

export async function assignTrainingAction(input: unknown): Promise<Result> {
  try {
    const session = await requirePermission("training.manage");
    const data = assignTrainingSchema.parse(input);
    await trainingService.assign(data, actorFrom(session));
    revalidatePath("/trainings");
    return { success: true };
  } catch (error) {
    return fail(error, "assignTrainingAction");
  }
}

export async function setAssignmentStatusAction(input: unknown): Promise<Result> {
  try {
    const session = await requirePermission("training.manage");
    const data = updateAssignmentStatusSchema.parse(input);
    await trainingService.setAssignmentStatus(data, actorFrom(session));
    revalidatePath("/trainings");
    return { success: true };
  } catch (error) {
    return fail(error, "setAssignmentStatusAction");
  }
}
