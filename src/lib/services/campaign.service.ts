import { ObjectId } from "mongodb";

import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { assessmentResultRepo } from "@/lib/db/repositories/assessment-result.repository";
import { questionRepo } from "@/lib/db/repositories/question.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { scoringService } from "@/lib/services/scoring.service";
import { notificationService } from "@/lib/services/notification.service";
import { auditService } from "@/lib/services/audit.service";
import type {
  Assessment,
  AssessmentScope,
  CampaignScope,
} from "@/lib/domain/types/assessment.types";
import { CAMPAIGN_STATUS, FINAL_STATUS, STATUS } from "@/lib/domain/constants";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";

/**
 * Marker stored in `description` for the auto-generated one-participant
 * campaigns behind direct one-on-one assignments (see
 * `assessmentService.assignToEmployee`).
 */
export const DIRECT_ASSIGNMENT_DESCRIPTION = "Direct individual assignment";

/** A direct one-on-one assignment row for the Assessments hub. */
export interface OneOnOneRow {
  campaignId: ObjectId;
  assessmentId: ObjectId | null;
  employeeId: ObjectId | null;
  employeeName: string;
  /** Who is currently set to rate this assessment (reassignable at send time). */
  lineManagerId: ObjectId | null;
  sentAt: Date;
  campaignStatus: string;
  selfStatus: string;
  managerStatus: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string | null;
  jobFamilyId: ObjectId;
  divisions?: string[];
  /** Explicitly hand-picked employees. When empty, targeting filters apply. */
  participantIds?: ObjectId[];
  scope?: CampaignScope;
  startDate: Date;
  selfAssessmentDeadline: Date;
  managerAssessmentDeadline: Date;
  calibrationDeadline: Date;
}

/**
 * Resolve a campaign scope into the concrete question + sub-competency ids to
 * snapshot onto an assessment. `full` yields empty sets (meaning "everything").
 */
export async function resolveAssessmentScope(
  scope: CampaignScope | undefined,
): Promise<AssessmentScope> {
  if (!scope || scope.mode !== "custom" || scope.questionIds.length === 0) {
    return { mode: "full", questionIds: [], subCompetencyIds: [] };
  }
  const questions = await questionRepo.findByIds(scope.questionIds);
  const subIds = new Map<string, ObjectId>();
  for (const q of questions) subIds.set(q.subCompetencyId.toString(), q.subCompetencyId);
  return {
    mode: "custom",
    questionIds: scope.questionIds,
    subCompetencyIds: [...subIds.values()],
  };
}

export const campaignService = {
  /**
   * Everything the Assessments hub lists: real campaigns and direct
   * one-on-one assignments (one-participant campaigns), split apart, with the
   * one-on-ones joined to their single assessment + employee.
   */
  async listForHub(): Promise<{
    campaigns: Awaited<ReturnType<typeof campaignRepo.findAll>>;
    oneOnOnes: OneOnOneRow[];
  }> {
    const all = await campaignRepo.findAll();
    const campaigns = all.filter(
      (c) => c.description !== DIRECT_ASSIGNMENT_DESCRIPTION,
    );
    const directs = all.filter(
      (c) => c.description === DIRECT_ASSIGNMENT_DESCRIPTION,
    );

    const [assessments, employees] = await Promise.all([
      assessmentRepo.findByCampaigns(directs.map((c) => c._id)),
      userRepo.findManyByIdsAny(
        directs.flatMap((c) => (c.participantIds[0] ? [c.participantIds[0]] : [])),
      ),
    ]);
    const assessmentByCampaign = new Map(
      assessments.map((a) => [a.campaignId.toString(), a]),
    );
    const nameById = new Map(employees.map((u) => [u._id.toString(), u.fullName]));

    const oneOnOnes: OneOnOneRow[] = directs.map((c) => {
      const a = assessmentByCampaign.get(c._id.toString());
      const employeeId = c.participantIds[0] ?? null;
      return {
        campaignId: c._id,
        assessmentId: a?._id ?? null,
        employeeId,
        employeeName:
          (employeeId && nameById.get(employeeId.toString())) || "Unknown",
        lineManagerId: a?.lineManagerId ?? null,
        sentAt: c.startDate,
        campaignStatus: c.status,
        selfStatus: a?.selfAssessment.status ?? "not_started",
        managerStatus: a?.managerAssessment.status ?? "not_started",
      };
    });

    return { campaigns, oneOnOnes };
  },

  /**
   * Create a Draft campaign. Participants are resolved immediately from the
   * targeting filters (job family + optional divisions) so HR can preview them.
   */
  async createCampaign(input: CreateCampaignInput, actorId: ObjectId) {
    // Explicit hand-picked recipients take precedence; otherwise resolve from
    // the job-family/division targeting filters.
    let participants;
    if (input.participantIds && input.participantIds.length > 0) {
      participants = await userRepo.findManyByIds(input.participantIds);
    } else {
      participants = await userRepo.findParticipants({
        jobFamilyId: input.jobFamilyId,
        divisions: input.divisions,
      });
    }
    const scope: CampaignScope = input.scope ?? { mode: "full", questionIds: [] };
    const now = new Date();

    const campaign = await campaignRepo.insert({
      name: input.name,
      description: input.description ?? null,
      jobFamilyIds: [input.jobFamilyId],
      divisionFilter: input.divisions ?? [],
      participantIds: participants.map((p) => p._id),
      scope,
      startDate: input.startDate,
      selfAssessmentDeadline: input.selfAssessmentDeadline,
      managerAssessmentDeadline: input.managerAssessmentDeadline,
      calibrationDeadline: input.calibrationDeadline,
      status: CAMPAIGN_STATUS.DRAFT,
      reminderConfig: { enabled: true, daysBefore: [7, 3, 1] },
      stats: {
        totalParticipants: participants.length,
        selfCompleted: 0,
        managerCompleted: 0,
        calibrationOutliers: 0,
        finalized: 0,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      updatedBy: actorId,
    });

    await auditService.log({
      actorId,
      action: "campaign.created",
      entityType: "AssessmentCampaign",
      entityId: campaign._id,
      before: null,
      after: { name: campaign.name, participants: participants.length },
    });
    return campaign;
  },

  /**
   * Launch a Draft campaign: materialize an Assessment per participant,
   * snapshotting the employee's role / job family / line manager at this moment,
   * then flip the campaign to Active.
   */
  async launchCampaign(campaignId: ObjectId, actorId: ObjectId) {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign");
    if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
      throw new ConflictError("Only Draft campaigns can be launched");
    }

    const participants = await userRepo.findManyByIds(campaign.participantIds);
    const now = new Date();
    const scope = await resolveAssessmentScope(campaign.scope);

    const assessments: Omit<Assessment, "_id">[] = participants.map((emp) => ({
      campaignId,
      employeeId: emp._id,
      lineManagerId: emp.lineManagerId,
      designationAtCampaign: emp.designation,
      jobFamilyAtCampaign: emp.jobFamily,
      scope,
      selfAssessment: {
        status: STATUS.NOT_STARTED,
        startedAt: null,
        submittedAt: null,
        progress: 0,
        answers: [],
      },
      managerAssessment: {
        status: STATUS.NOT_STARTED,
        startedAt: null,
        submittedAt: null,
        progress: 0,
        ratings: [],
      },
      calibrationAdjustments: [],
      finalStatus: FINAL_STATUS.PENDING,
      finalizedAt: null,
      finalizedBy: null,
      createdAt: now,
      updatedAt: now,
    }));

    const created = await assessmentRepo.insertMany(assessments);
    await campaignRepo.setStatus(campaignId, CAMPAIGN_STATUS.ACTIVE, actorId);
    await notificationService.notifyAssignments(campaignId);
    await auditService.log({
      actorId,
      action: "campaign.launched",
      entityType: "AssessmentCampaign",
      entityId: campaignId,
      after: { assessmentsCreated: created },
    });

    return { campaignId, assessmentsCreated: created };
  },

  /** Move an Active campaign into the calibration phase. */
  async moveToCalibration(campaignId: ObjectId, actorId: ObjectId) {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign");
    if (campaign.status !== CAMPAIGN_STATUS.ACTIVE) {
      throw new ConflictError("Only Active campaigns can enter calibration");
    }
    await campaignRepo.setStatus(
      campaignId,
      CAMPAIGN_STATUS.IN_CALIBRATION,
      actorId,
    );
    await auditService.log({
      actorId,
      action: "campaign.launched",
      entityType: "AssessmentCampaign",
      entityId: campaignId,
      before: { status: CAMPAIGN_STATUS.ACTIVE },
      after: { status: CAMPAIGN_STATUS.IN_CALIBRATION },
    });
    return { campaignId, status: CAMPAIGN_STATUS.IN_CALIBRATION };
  },

  /**
   * Lock a campaign: finalize every assessment, freeze all computed results,
   * and flip the campaign to Locked. Only valid from the calibration phase.
   */
  async lockCampaign(campaignId: ObjectId, actorId: ObjectId) {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign");
    if (campaign.status !== CAMPAIGN_STATUS.IN_CALIBRATION) {
      throw new ConflictError(
        "Only campaigns in calibration can be locked",
      );
    }

    const assessments = await assessmentRepo.findByCampaign(campaignId);
    for (const a of assessments) {
      await assessmentRepo.setFinalStatus(
        a._id,
        FINAL_STATUS.FINALIZED,
        actorId,
      );
    }
    const frozen = await assessmentResultRepo.lockByCampaign(campaignId);
    await campaignRepo.setStatus(campaignId, CAMPAIGN_STATUS.LOCKED, actorId);
    await scoringService.refreshCampaignStats(campaignId);
    await notificationService.notifyFinalized(campaignId);
    await auditService.log({
      actorId,
      action: "campaign.locked",
      entityType: "AssessmentCampaign",
      entityId: campaignId,
      after: { finalized: assessments.length, resultsFrozen: frozen },
    });

    return { campaignId, finalized: assessments.length, resultsFrozen: frozen };
  },

  /**
   * Extend an active campaign's deadlines (FR-CMP-003). Only valid while the
   * campaign is Active. Calibration deadline is pushed to stay >= manager.
   */
  async extendDeadline(
    campaignId: ObjectId,
    input: { selfAssessmentDeadline: Date; managerAssessmentDeadline: Date },
    actorId: ObjectId,
  ) {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign");
    if (campaign.status !== CAMPAIGN_STATUS.ACTIVE) {
      throw new ConflictError("Only Active campaigns can have deadlines extended");
    }
    if (input.managerAssessmentDeadline < input.selfAssessmentDeadline) {
      throw new ConflictError(
        "Manager deadline cannot be before the self-assessment deadline",
      );
    }
    const calibrationDeadline =
      campaign.calibrationDeadline < input.managerAssessmentDeadline
        ? input.managerAssessmentDeadline
        : campaign.calibrationDeadline;

    await campaignRepo.setDeadlines(
      campaignId,
      {
        selfAssessmentDeadline: input.selfAssessmentDeadline,
        managerAssessmentDeadline: input.managerAssessmentDeadline,
        calibrationDeadline,
      },
      actorId,
    );
    await auditService.log({
      actorId,
      action: "campaign.deadline_extended",
      entityType: "AssessmentCampaign",
      entityId: campaignId,
      before: {
        selfAssessmentDeadline: campaign.selfAssessmentDeadline,
        managerAssessmentDeadline: campaign.managerAssessmentDeadline,
      },
      after: {
        selfAssessmentDeadline: input.selfAssessmentDeadline,
        managerAssessmentDeadline: input.managerAssessmentDeadline,
      },
    });
    return { campaignId };
  },
};
