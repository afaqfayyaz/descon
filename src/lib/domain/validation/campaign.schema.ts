import { z } from "zod";
import { objectIdSchema } from "./common.schema";

export const campaignScopeSchema = z.object({
  mode: z.enum(["full", "custom"]),
  questionIds: z.array(objectIdSchema).default([]),
});

export const createCampaignSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(120),
    description: z.string().trim().max(1000).optional().nullable(),
    jobFamilyId: objectIdSchema,
    divisions: z.array(z.string().trim().min(1)).default([]),
    participantIds: z.array(objectIdSchema).default([]),
    scope: campaignScopeSchema.default({ mode: "full", questionIds: [] }),
    startDate: z.coerce.date(),
    selfAssessmentDeadline: z.coerce.date(),
    managerAssessmentDeadline: z.coerce.date(),
    calibrationDeadline: z.coerce.date(),
  })
  .refine((d) => d.scope.mode === "full" || d.scope.questionIds.length > 0, {
    message: "Select at least one question for a custom test",
    path: ["scope"],
  })
  .refine((d) => d.selfAssessmentDeadline > d.startDate, {
    message: "Self deadline must be after the start date",
    path: ["selfAssessmentDeadline"],
  })
  .refine((d) => d.managerAssessmentDeadline > d.selfAssessmentDeadline, {
    message: "Manager deadline must be after the self deadline",
    path: ["managerAssessmentDeadline"],
  })
  .refine((d) => d.calibrationDeadline > d.managerAssessmentDeadline, {
    message: "Calibration deadline must be after the manager deadline",
    path: ["calibrationDeadline"],
  });
