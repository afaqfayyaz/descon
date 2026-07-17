"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { employeeService } from "@/lib/services/employee.service";
import {
  createApplicationUserSchema,
  createUserSchema,
  importUserRowSchema,
  updateUserSchema,
} from "@/lib/domain/validation/user.schema";
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

export async function createEmployeeAction(input: unknown): Promise<Result> {
  try {
    const session = await requirePermission("user.manage");
    const data = createUserSchema.parse(input);
    await employeeService.create(data, actorFrom(session));
    revalidatePath("/employees");
    return { success: true };
  } catch (error) {
    return fail(error, "createEmployeeAction");
  }
}

export async function updateEmployeeAction(
  id: string,
  input: unknown,
): Promise<Result> {
  try {
    const session = await requirePermission("user.manage");
    const data = updateUserSchema.parse(input);
    await employeeService.update(new ObjectId(id), data, actorFrom(session));
    revalidatePath("/employees");
    return { success: true };
  } catch (error) {
    return fail(error, "updateEmployeeAction");
  }
}

export async function deactivateEmployeeAction(id: string): Promise<Result> {
  try {
    const session = await requirePermission("user.manage");
    await employeeService.deactivate(new ObjectId(id), actorFrom(session));
    revalidatePath("/employees");
    return { success: true };
  } catch (error) {
    return fail(error, "deactivateEmployeeAction");
  }
}

export async function restoreEmployeeAction(id: string): Promise<Result> {
  try {
    const session = await requirePermission("user.manage");
    await employeeService.restore(new ObjectId(id), actorFrom(session));
    revalidatePath("/employees");
    return { success: true };
  } catch (error) {
    return fail(error, "restoreEmployeeAction");
  }
}

/**
 * Create an application user. Gated on settings.manage rather than
 * user.manage: granting platform access is an administrative act, not part of
 * maintaining the staff directory.
 */
export async function createApplicationUserAction(
  input: unknown,
): Promise<Result> {
  try {
    const session = await requirePermission("settings.manage");
    const data = createApplicationUserSchema.parse(input);
    await employeeService.createApplicationUser(data, actorFrom(session));
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return fail(error, "createApplicationUserAction");
  }
}

export async function deactivateApplicationUserAction(
  id: string,
): Promise<Result> {
  try {
    const session = await requirePermission("settings.manage");
    await employeeService.deactivate(new ObjectId(id), actorFrom(session));
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return fail(error, "deactivateApplicationUserAction");
  }
}

export async function bulkImportEmployeesAction(
  input: unknown,
): Promise<
  | { success: true; created: number; updated: number; errors: string[] }
  | { success: false; error: string }
> {
  try {
    const session = await requirePermission("user.manage");
    const { rows } = z.object({ rows: z.array(importUserRowSchema) }).parse(input);
    const result = await employeeService.bulkImport(rows, actorFrom(session));
    revalidatePath("/employees");
    return { success: true, ...result };
  } catch (error) {
    return fail(error, "bulkImportEmployeesAction");
  }
}
