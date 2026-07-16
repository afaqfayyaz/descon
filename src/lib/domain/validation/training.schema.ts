import { z } from "zod";
import { objectIdSchema } from "./common.schema";

const trainingTypeSchema = z.enum([
  "course",
  "certification",
  "workshop",
  "mentoring",
  "stretch_assignment",
  "other",
]);

export const createTrainingSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  description: z.string().max(1000).nullable().optional(),
  type: trainingTypeSchema,
  durationHours: z.number().min(0).max(10000).nullable().optional(),
  provider: z.string().max(120).nullable().optional(),
  url: z.string().url("Must be a valid URL").max(500).nullable().optional(),
  addressesSubCompetencies: z.array(objectIdSchema).max(200).default([]),
});
export type CreateTrainingInput = z.infer<typeof createTrainingSchema>;

export const updateTrainingSchema = createTrainingSchema;
export type UpdateTrainingInput = z.infer<typeof updateTrainingSchema>;

export const assignTrainingSchema = z.object({
  trainingId: objectIdSchema,
  employeeId: objectIdSchema,
  dueDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type AssignTrainingInput = z.infer<typeof assignTrainingSchema>;

export const updateAssignmentStatusSchema = z.object({
  trainingId: objectIdSchema,
  employeeId: objectIdSchema,
  assignedAt: z.coerce.date(),
  status: z.enum(["assigned", "in_progress", "completed", "cancelled"]),
});
export type UpdateAssignmentStatusInput = z.infer<
  typeof updateAssignmentStatusSchema
>;
