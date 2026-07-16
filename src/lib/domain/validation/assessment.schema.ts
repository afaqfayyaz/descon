import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const saveSelfAnswerSchema = z.object({
  questionId: objectIdSchema,
  questionVersion: z.number().int().min(1),
  selectedOption: z.string().min(1).max(2),
});
export type SaveSelfAnswerInput = z.infer<typeof saveSelfAnswerSchema>;

export const saveManagerRatingSchema = z.object({
  subCompetencyId: objectIdSchema,
  rating: z.number().int().min(1).max(5),
  evidence: z.string().max(1000).nullable().optional(),
});
export type SaveManagerRatingInput = z.infer<typeof saveManagerRatingSchema>;
