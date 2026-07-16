"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/permissions";
import { frameworkService } from "@/lib/services/framework.service";
import {
  createCompetencyAreaSchema,
  createJobFamilySchema,
  createQuestionSchema,
  createRoleSchema,
  createSubCompetencySchema,
  saveRequiredLevelsSchema,
  updateCompetencyAreaSchema,
  updateJobFamilySchema,
  updateQuestionSchema,
  updateRoleSchema,
  updateSubCompetencySchema,
} from "@/lib/domain/validation/framework.schema";
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

/* ----------------------------- Job Families --------------------------- */

export async function createJobFamilyAction(input: unknown): Promise<Result> {
  try {
    const session = await requirePermission("framework.family.create");
    const data = createJobFamilySchema.parse(input);
    await frameworkService.createJobFamily(data, actorFrom(session));
    revalidatePath("/framework");
    return { success: true };
  } catch (error) {
    return fail(error, "createJobFamilyAction");
  }
}

export async function updateJobFamilyAction(
  id: string,
  input: unknown,
): Promise<Result> {
  try {
    const session = await requirePermission("framework.family.update");
    const data = updateJobFamilySchema.parse(input);
    await frameworkService.updateJobFamily(
      new ObjectId(id),
      data,
      actorFrom(session),
    );
    revalidatePath("/framework");
    return { success: true };
  } catch (error) {
    return fail(error, "updateJobFamilyAction");
  }
}

export async function archiveJobFamilyAction(id: string): Promise<Result> {
  try {
    const session = await requirePermission("framework.family.delete");
    await frameworkService.archiveJobFamily(new ObjectId(id), actorFrom(session));
    revalidatePath("/framework");
    return { success: true };
  } catch (error) {
    return fail(error, "archiveJobFamilyAction");
  }
}

/* ------------------------------- Areas -------------------------------- */

export async function createAreaAction(input: unknown): Promise<Result> {
  try {
    const session = await requirePermission("framework.area.create");
    const data = createCompetencyAreaSchema.parse(input);
    await frameworkService.createArea(data, actorFrom(session));
    revalidatePath("/framework");
    return { success: true };
  } catch (error) {
    return fail(error, "createAreaAction");
  }
}

export async function updateAreaAction(
  id: string,
  input: unknown,
): Promise<Result> {
  try {
    const session = await requirePermission("framework.area.update");
    const data = updateCompetencyAreaSchema.parse(input);
    await frameworkService.updateArea(new ObjectId(id), data, actorFrom(session));
    revalidatePath("/framework");
    return { success: true };
  } catch (error) {
    return fail(error, "updateAreaAction");
  }
}

export async function archiveAreaAction(id: string): Promise<Result> {
  try {
    const session = await requirePermission("framework.area.delete");
    await frameworkService.archiveArea(new ObjectId(id), actorFrom(session));
    revalidatePath("/framework");
    return { success: true };
  } catch (error) {
    return fail(error, "archiveAreaAction");
  }
}

/* --------------------------- Sub-Competencies ------------------------- */

export async function createSubAction(input: unknown): Promise<Result> {
  try {
    const session = await requirePermission("framework.subCompetency.create");
    const data = createSubCompetencySchema.parse(input);
    await frameworkService.createSubCompetency(data, actorFrom(session));
    revalidatePath(`/framework/areas/${data.areaId.toString()}`);
    return { success: true };
  } catch (error) {
    return fail(error, "createSubAction");
  }
}

export async function updateSubAction(
  id: string,
  input: unknown,
): Promise<Result> {
  try {
    const session = await requirePermission("framework.subCompetency.update");
    const data = updateSubCompetencySchema.parse(input);
    await frameworkService.updateSubCompetency(
      new ObjectId(id),
      data,
      actorFrom(session),
    );
    revalidatePath("/framework", "layout");
    return { success: true };
  } catch (error) {
    return fail(error, "updateSubAction");
  }
}

export async function archiveSubAction(id: string): Promise<Result> {
  try {
    const session = await requirePermission("framework.subCompetency.delete");
    await frameworkService.archiveSubCompetency(
      new ObjectId(id),
      actorFrom(session),
    );
    revalidatePath("/framework", "layout");
    return { success: true };
  } catch (error) {
    return fail(error, "archiveSubAction");
  }
}

/* ------------------------------- Questions ---------------------------- */

export async function createQuestionAction(input: unknown): Promise<Result> {
  try {
    const session = await requirePermission("framework.question.create");
    const data = createQuestionSchema.parse(input);
    await frameworkService.createQuestion(data, actorFrom(session));
    revalidatePath(
      `/framework/sub-competencies/${data.subCompetencyId.toString()}`,
    );
    return { success: true };
  } catch (error) {
    return fail(error, "createQuestionAction");
  }
}

export async function updateQuestionAction(
  id: string,
  input: unknown,
): Promise<Result> {
  try {
    const session = await requirePermission("framework.question.update");
    const data = updateQuestionSchema.parse(input);
    await frameworkService.updateQuestion(
      new ObjectId(id),
      data,
      actorFrom(session),
    );
    revalidatePath("/framework", "layout");
    return { success: true };
  } catch (error) {
    return fail(error, "updateQuestionAction");
  }
}

export async function archiveQuestionAction(id: string): Promise<Result> {
  try {
    const session = await requirePermission("framework.question.delete");
    await frameworkService.archiveQuestion(new ObjectId(id), actorFrom(session));
    revalidatePath("/framework", "layout");
    return { success: true };
  } catch (error) {
    return fail(error, "archiveQuestionAction");
  }
}

/* --------------------------------- Roles ------------------------------ */

export async function createRoleAction(input: unknown): Promise<Result> {
  try {
    const session = await requirePermission("framework.role.create");
    const data = createRoleSchema.parse(input);
    await frameworkService.createRole(data, actorFrom(session));
    revalidatePath("/roles");
    return { success: true };
  } catch (error) {
    return fail(error, "createRoleAction");
  }
}

export async function updateRoleAction(
  id: string,
  input: unknown,
): Promise<Result> {
  try {
    const session = await requirePermission("framework.role.update");
    const data = updateRoleSchema.parse(input);
    await frameworkService.updateRole(new ObjectId(id), data, actorFrom(session));
    revalidatePath("/roles");
    return { success: true };
  } catch (error) {
    return fail(error, "updateRoleAction");
  }
}

export async function archiveRoleAction(id: string): Promise<Result> {
  try {
    const session = await requirePermission("framework.role.delete");
    await frameworkService.archiveRole(new ObjectId(id), actorFrom(session));
    revalidatePath("/roles");
    return { success: true };
  } catch (error) {
    return fail(error, "archiveRoleAction");
  }
}

/* ---------------------------- Required Levels ------------------------- */

export async function saveRequiredLevelsAction(
  input: unknown,
): Promise<{ success: true; changed: number } | { success: false; error: string }> {
  try {
    const session = await requirePermission("framework.requiredLevel.update");
    const data = saveRequiredLevelsSchema.parse(input);
    const { changed } = await frameworkService.saveRequiredLevels(
      data.cells,
      actorFrom(session),
    );
    revalidatePath("/required-levels");
    revalidatePath("/framework");
    return { success: true, changed };
  } catch (error) {
    const f = fail(error, "saveRequiredLevelsAction");
    return f;
  }
}
