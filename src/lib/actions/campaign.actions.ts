"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { campaignService } from "@/lib/services/campaign.service";
import { frameworkService, type ScopeArea } from "@/lib/services/framework.service";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { createCampaignSchema } from "@/lib/domain/validation/campaign.schema";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export interface CampaignFormValues {
  name: string;
  description?: string | null;
  jobFamilyId: string;
  divisions: string[];
  participantIds: string[];
  scope: { mode: "full" | "custom"; questionIds: string[] };
  startDate: string;
  selfAssessmentDeadline: string;
  managerAssessmentDeadline: string;
  calibrationDeadline: string;
}

type CreateResult =
  | { success: true; campaignId: string }
  | { success: false; error: string };

export async function createCampaignAction(
  values: CampaignFormValues,
): Promise<CreateResult> {
  try {
    const session = await requirePermission("campaign.create");
    const parsed = createCampaignSchema.safeParse(values);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    const data = parsed.data;
    // objectIdSchema already transforms strings into ObjectIds.
    const campaign = await campaignService.createCampaign(
      {
        name: data.name,
        description: data.description ?? null,
        jobFamilyId: data.jobFamilyId,
        divisions: data.divisions,
        participantIds: data.participantIds,
        scope: { mode: data.scope.mode, questionIds: data.scope.questionIds },
        startDate: data.startDate,
        selfAssessmentDeadline: data.selfAssessmentDeadline,
        managerAssessmentDeadline: data.managerAssessmentDeadline,
        calibrationDeadline: data.calibrationDeadline,
      },
      new ObjectId(session.user.id),
    );
    revalidatePath("/campaigns");
    return { success: true, campaignId: campaign._id.toString() };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "createCampaignAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

type LaunchResult =
  | { success: true; assessmentsCreated: number }
  | { success: false; error: string };

export async function launchCampaignAction(
  campaignId: string,
): Promise<LaunchResult> {
  try {
    const session = await requirePermission("campaign.launch");
    const res = await campaignService.launchCampaign(
      new ObjectId(campaignId),
      new ObjectId(session.user.id),
    );
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/campaigns");
    return { success: true, assessmentsCreated: res.assessmentsCreated };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "launchCampaignAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

type TransitionResult =
  | { success: true }
  | { success: false; error: string };

export async function moveToCalibrationAction(
  campaignId: string,
): Promise<TransitionResult> {
  try {
    const session = await requirePermission("campaign.finalize");
    await campaignService.moveToCalibration(
      new ObjectId(campaignId),
      new ObjectId(session.user.id),
    );
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "moveToCalibrationAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

export async function lockCampaignAction(
  campaignId: string,
): Promise<TransitionResult> {
  try {
    const session = await requirePermission("campaign.finalize");
    await campaignService.lockCampaign(
      new ObjectId(campaignId),
      new ObjectId(session.user.id),
    );
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "lockCampaignAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

export async function extendDeadlineAction(
  campaignId: string,
  selfDeadline: string,
  managerDeadline: string,
): Promise<TransitionResult> {
  try {
    const session = await requirePermission("campaign.finalize");
    const self = new Date(selfDeadline);
    const mgr = new Date(managerDeadline);
    if (Number.isNaN(self.getTime()) || Number.isNaN(mgr.getTime())) {
      return { success: false, error: "Please provide valid dates" };
    }
    await campaignService.extendDeadline(
      new ObjectId(campaignId),
      { selfAssessmentDeadline: self, managerAssessmentDeadline: mgr },
      new ObjectId(session.user.id),
    );
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "extendDeadlineAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

type PreviewResult =
  | { success: true; count: number; sample: string[] }
  | { success: false; error: string };

export interface CandidateEmployee {
  id: string;
  fullName: string;
  email: string;
  division: string;
  designation: string;
}

type CandidatesResult =
  | { success: true; employees: CandidateEmployee[] }
  | { success: false; error: string };

/** List selectable employees for a job family (for the recipients picker). */
export async function listCandidatesAction(
  jobFamilyId: string,
): Promise<CandidatesResult> {
  try {
    await requirePermission("campaign.create");
    if (!ObjectId.isValid(jobFamilyId)) {
      return { success: true, employees: [] };
    }
    const [users, roles] = await Promise.all([
      userRepo.findParticipants({ jobFamilyId: new ObjectId(jobFamilyId) }),
      roleRepo.findAll(),
    ]);
    const roleName = new Map(roles.map((r) => [r._id.toString(), r.name]));
    const employees = users
      .map((u) => ({
        id: u._id.toString(),
        fullName: u.fullName,
        email: u.email,
        division: u.division ?? "",
        designation: roleName.get(u.designation?.toString() ?? "") ?? "—",
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return { success: true, employees };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "listCandidatesAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

type ScopeTreeResult =
  | { success: true; areas: ScopeArea[] }
  | { success: false; error: string };

/** The areas → subs → questions tree for the test-scope selector. */
export async function getScopeTreeAction(
  jobFamilyId: string,
): Promise<ScopeTreeResult> {
  try {
    await requirePermission("campaign.create");
    if (!ObjectId.isValid(jobFamilyId)) {
      return { success: true, areas: [] };
    }
    const areas = await frameworkService.getScopeTree(new ObjectId(jobFamilyId));
    return { success: true, areas };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "getScopeTreeAction failed");
    return { success: false, error: "Something went wrong" };
  }
}

/** Live preview of who would be targeted by the current filters. */
export async function previewParticipantsAction(
  jobFamilyId: string,
  divisions: string[],
): Promise<PreviewResult> {
  try {
    await requirePermission("campaign.create");
    if (!ObjectId.isValid(jobFamilyId)) {
      return { success: true, count: 0, sample: [] };
    }
    const users = await userRepo.findParticipants({
      jobFamilyId: new ObjectId(jobFamilyId),
      divisions: divisions.length > 0 ? divisions : undefined,
    });
    return {
      success: true,
      count: users.length,
      sample: users.slice(0, 8).map((u) => u.fullName),
    };
  } catch (error) {
    if (error instanceof AppError)
      return { success: false, error: error.message };
    logger.error({ error }, "previewParticipantsAction failed");
    return { success: false, error: "Something went wrong" };
  }
}
