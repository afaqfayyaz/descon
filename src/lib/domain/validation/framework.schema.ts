import { z } from "zod";
import { objectIdSchema } from "./common.schema";

const codeRegex = /^[A-Z0-9.\-]+$/i;

/* ------------------------------- Job Family ------------------------------- */

export const createJobFamilySchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  code: z.string().min(1).max(20).regex(codeRegex, "Letters, numbers, dots, dashes only"),
  description: z.string().max(500).nullable().optional(),
});
export type CreateJobFamilyInput = z.infer<typeof createJobFamilySchema>;

export const updateJobFamilySchema = createJobFamilySchema;
export type UpdateJobFamilyInput = z.infer<typeof updateJobFamilySchema>;

/* ----------------------------- Competency Area ---------------------------- */

export const createCompetencyAreaSchema = z.object({
  jobFamilyId: objectIdSchema,
  name: z.string().min(1, "Name is required").max(120),
  code: z.string().min(1).max(20).regex(codeRegex, "Letters, numbers, dots, dashes only"),
  description: z.string().max(500).nullable().optional(),
  sequence: z.number().int().min(1),
  weight: z.number().min(0).max(10).default(1),
});
export type CreateCompetencyAreaInput = z.infer<typeof createCompetencyAreaSchema>;

export const updateCompetencyAreaSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(20).regex(codeRegex, "Letters, numbers, dots, dashes only"),
  description: z.string().max(500).nullable().optional(),
  sequence: z.number().int().min(1),
  weight: z.number().min(0).max(10),
});
export type UpdateCompetencyAreaInput = z.infer<typeof updateCompetencyAreaSchema>;

/* ------------------------------ Sub-Competency ---------------------------- */

export const createSubCompetencySchema = z.object({
  areaId: objectIdSchema,
  name: z.string().min(1, "Name is required").max(160),
  code: z.string().min(1).max(20).regex(codeRegex, "Letters, numbers, dots, dashes only"),
  description: z.string().max(800).nullable().optional(),
  behavioralIndicators: z.array(z.string().max(500)).max(10).default([]),
  sequence: z.number().int().min(1),
});
export type CreateSubCompetencyInput = z.infer<typeof createSubCompetencySchema>;

export const updateSubCompetencySchema = createSubCompetencySchema.omit({
  areaId: true,
});
export type UpdateSubCompetencyInput = z.infer<typeof updateSubCompetencySchema>;

/* --------------------------------- Question ------------------------------- */

export const questionOptionSchema = z.object({
  letter: z.string().min(1).max(2),
  text: z.string().min(1, "Option text is required").max(1000),
  score: z.number().int().min(0).max(100),
});

export const createQuestionSchema = z.object({
  subCompetencyId: objectIdSchema,
  text: z.string().min(1, "Question text is required").max(2000),
  options: z.array(questionOptionSchema).min(2, "At least 2 options").max(6),
  weight: z.number().min(0).max(100).default(1),
  sequence: z.number().int().min(1),
});
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const updateQuestionSchema = createQuestionSchema.omit({
  subCompetencyId: true,
});
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

/* ----------------------------------- Role --------------------------------- */

export const createRoleSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  code: z.string().min(1).max(20).regex(codeRegex, "Letters, numbers, dashes only"),
  level: z.number().int().min(1).max(20),
  description: z.string().max(300).nullable().optional(),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = createRoleSchema;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

/* ------------------------------ Required Levels --------------------------- */

export const requiredLevelCellSchema = z.object({
  subCompetencyId: objectIdSchema,
  roleId: objectIdSchema,
  requiredLevel: z.number().int().min(1).max(5),
});
export type RequiredLevelCellInput = z.infer<typeof requiredLevelCellSchema>;

export const saveRequiredLevelsSchema = z.object({
  cells: z.array(requiredLevelCellSchema).max(5000),
});
