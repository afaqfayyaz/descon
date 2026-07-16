import { ObjectId } from "mongodb";

import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { questionRepo } from "@/lib/db/repositories/question.repository";
import { scoringService } from "@/lib/services/scoring.service";
import {
  resolveAssessmentScope,
  DIRECT_ASSIGNMENT_DESCRIPTION,
} from "@/lib/services/campaign.service";
import { tokenService } from "@/lib/services/token.service";
import { auditService } from "@/lib/services/audit.service";
import { sendEmail } from "@/lib/email/send";
import type {
  Assessment,
  CampaignScope,
} from "@/lib/domain/types/assessment.types";
import type { User } from "@/lib/domain/types/user.types";
import type {
  SaveSelfAnswerInput,
  SaveManagerRatingInput,
} from "@/lib/domain/validation/assessment.schema";
import { CAMPAIGN_STATUS, FINAL_STATUS, STATUS } from "@/lib/domain/constants";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/utils/errors";

interface ActorContext {
  actorId: ObjectId;
  isHrAdmin?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function appUrl(path: string): string {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path}`;
}

function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0] || "there";
}

/** Count active questions and sub-competencies for a job family (cheap). */
async function frameworkSize(jobFamilyId: ObjectId) {
  const areas = await competencyAreaRepo.findByJobFamily(jobFamilyId);
  const subs = await subCompetencyRepo.findByAreas(areas.map((a) => a._id));
  const counts = await questionRepo.countsForSubs(subs.map((s) => s._id));
  let totalQuestions = 0;
  for (const c of counts.values()) totalQuestions += c;
  return { totalQuestions, totalSubs: subs.length };
}

/**
 * The number of questions/sub-competencies an assessment actually covers,
 * honouring its snapshotted test scope. `full` falls back to the whole
 * framework; `custom` uses the snapshotted counts.
 */
async function scopedSize(assessment: Assessment) {
  if (assessment.scope && assessment.scope.mode === "custom") {
    return {
      totalQuestions: assessment.scope.questionIds.length,
      totalSubs: assessment.scope.subCompetencyIds.length,
    };
  }
  return frameworkSize(assessment.jobFamilyAtCampaign);
}

export const assessmentService = {
  /** Employee saves (or replaces) one self-assessment answer. Auto-saves. */
  async saveSelfAnswer(
    assessmentId: ObjectId,
    input: SaveSelfAnswerInput,
    ctx: ActorContext,
  ) {
    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");
    if (!ctx.isHrAdmin && !assessment.employeeId.equals(ctx.actorId)) {
      throw new ForbiddenError("answer this assessment");
    }
    if (assessment.selfAssessment.status === STATUS.SUBMITTED) {
      throw new ConflictError("Self-assessment already submitted");
    }

    if (!assessment.selfAssessment.startedAt) {
      await assessmentRepo.setSelfStatus(assessmentId, STATUS.IN_PROGRESS, {
        startedAt: new Date(),
      });
    }

    await assessmentRepo.upsertSelfAnswer(assessmentId, {
      questionId: input.questionId,
      questionVersion: input.questionVersion,
      selectedOption: input.selectedOption,
      answeredAt: new Date(),
    });

    // Recompute progress
    const { totalQuestions } = await scopedSize(assessment);
    const fresh = await assessmentRepo.findById(assessmentId);
    const answered = fresh?.selfAssessment.answers.length ?? 0;
    const progress =
      totalQuestions > 0
        ? Math.round((answered / totalQuestions) * 100)
        : 0;
    await assessmentRepo.setSelfProgress(assessmentId, progress);
    return { progress, answered, totalQuestions };
  },

  /** Employee submits their self-assessment (locks it). */
  async submitSelf(assessmentId: ObjectId, ctx: ActorContext) {
    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");
    if (!ctx.isHrAdmin && !assessment.employeeId.equals(ctx.actorId)) {
      throw new ForbiddenError("submit this assessment");
    }
    if (assessment.selfAssessment.status === STATUS.SUBMITTED) {
      throw new ConflictError("Already submitted");
    }

    await assessmentRepo.setSelfStatus(assessmentId, STATUS.SUBMITTED, {
      submittedAt: new Date(),
      progress: 100,
    });

    await this.maybeCompute(assessmentId);
    await scoringService.refreshCampaignStats(assessment.campaignId);
  },

  /** Line manager saves (or replaces) one rating. Auto-saves. */
  async saveManagerRating(
    assessmentId: ObjectId,
    input: SaveManagerRatingInput,
    ctx: ActorContext,
  ) {
    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");
    const isManager = assessment.lineManagerId?.equals(ctx.actorId) ?? false;
    if (!ctx.isHrAdmin && !isManager) {
      throw new ForbiddenError("rate this employee");
    }
    if (assessment.employeeId.equals(ctx.actorId)) {
      throw new ForbiddenError("rate yourself");
    }
    if (assessment.managerAssessment.status === STATUS.SUBMITTED) {
      throw new ConflictError("Manager rating already submitted");
    }

    if (!assessment.managerAssessment.startedAt) {
      await assessmentRepo.setManagerStatus(assessmentId, STATUS.IN_PROGRESS, {
        startedAt: new Date(),
      });
    }

    await assessmentRepo.upsertManagerRating(assessmentId, {
      subCompetencyId: input.subCompetencyId,
      rating: input.rating,
      evidence: input.evidence ?? null,
      ratedAt: new Date(),
    });

    const { totalSubs } = await scopedSize(assessment);
    const fresh = await assessmentRepo.findById(assessmentId);
    const rated = fresh?.managerAssessment.ratings.length ?? 0;
    const progress =
      totalSubs > 0 ? Math.round((rated / totalSubs) * 100) : 0;
    await assessmentRepo.setManagerProgress(assessmentId, progress);
    return { progress, rated, totalSubs };
  },

  /** Line manager submits their rating (must rate all sub-competencies). */
  async submitManager(assessmentId: ObjectId, ctx: ActorContext) {
    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");
    const isManager = assessment.lineManagerId?.equals(ctx.actorId) ?? false;
    if (!ctx.isHrAdmin && !isManager) {
      throw new ForbiddenError("submit this rating");
    }
    if (assessment.managerAssessment.status === STATUS.SUBMITTED) {
      throw new ConflictError("Already submitted");
    }

    const { totalSubs } = await scopedSize(assessment);
    if (assessment.managerAssessment.ratings.length < totalSubs) {
      throw new ValidationError("All sub-competencies must be rated", {
        rated: assessment.managerAssessment.ratings.length,
        totalSubs,
      });
    }

    await assessmentRepo.setManagerStatus(assessmentId, STATUS.SUBMITTED, {
      submittedAt: new Date(),
      progress: 100,
    });

    await this.maybeCompute(assessmentId);
    await scoringService.refreshCampaignStats(assessment.campaignId);
  },

  /* ----------------------- Direct (one-employee) assign ----------------- */

  /**
   * Assign the questionnaire to a single employee. Creates a one-participant
   * campaign (so all existing scoring/results/aggregation keep working off
   * `campaignId`), materializes one Assessment snapshotting the employee's
   * designation/job-family/line-manager, issues a secure self token, and emails
   * the employee their passwordless link. Returns the assessment id + raw link.
   */
  async assignToEmployee(
    employeeId: ObjectId,
    actor: { id: ObjectId; email: string },
    scopeInput?: CampaignScope,
  ): Promise<{ assessmentId: ObjectId; link: string }> {
    const emp = await userRepo.findById(employeeId);
    if (!emp) throw new NotFoundError("Employee");

    const now = new Date();
    const campaignScope: CampaignScope = scopeInput ?? {
      mode: "full",
      questionIds: [],
    };
    const scope = await resolveAssessmentScope(campaignScope);
    const campaign = await campaignRepo.insert({
      name: `Assessment · ${emp.fullName} · ${now.toLocaleDateString("en-GB")}`,
      description: DIRECT_ASSIGNMENT_DESCRIPTION,
      jobFamilyIds: [emp.jobFamily],
      divisionFilter: [],
      participantIds: [emp._id],
      scope: campaignScope,
      startDate: now,
      selfAssessmentDeadline: new Date(now.getTime() + 30 * DAY_MS),
      managerAssessmentDeadline: new Date(now.getTime() + 37 * DAY_MS),
      calibrationDeadline: new Date(now.getTime() + 44 * DAY_MS),
      status: CAMPAIGN_STATUS.ACTIVE,
      reminderConfig: { enabled: false, daysBefore: [] },
      stats: {
        totalParticipants: 1,
        selfCompleted: 0,
        managerCompleted: 0,
        calibrationOutliers: 0,
        finalized: 0,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    const assessment: Omit<Assessment, "_id"> = {
      campaignId: campaign._id,
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
    };
    await assessmentRepo.insertMany([assessment]);
    const created = await assessmentRepo.findByCampaignAndEmployee(
      campaign._id,
      emp._id,
    );
    if (!created) throw new ConflictError("Failed to create assessment");

    const link = await this.emailSelfLink(created, emp, actor.id);
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "assessment.assigned",
      entityType: "Assessment",
      entityId: created._id,
      after: { employee: emp.fullName },
    });
    return { assessmentId: created._id, link };
  },

  /** Re-issue and email the secure self link for an existing assessment. */
  async resendSelfLink(
    assessmentId: ObjectId,
    actorId: ObjectId,
  ): Promise<{ link: string }> {
    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");
    if (assessment.selfAssessment.status === STATUS.SUBMITTED) {
      throw new ConflictError("Self-assessment already submitted");
    }
    const emp = await userRepo.findById(assessment.employeeId);
    if (!emp) throw new NotFoundError("Employee");
    const link = await this.emailSelfLink(assessment, emp, actorId);
    return { link };
  },

  /**
   * Issue and email the rater's secure scoring link once the self-side is
   * submitted. HR picks the rater at send time: passing `raterId` reassigns
   * this assessment to that person (any active employee) before sending, so a
   * stale or missing line manager can be redirected without touching the
   * employee's org chart. Falls back to the snapshotted line manager.
   */
  async resendManagerLink(
    assessmentId: ObjectId,
    raterId?: ObjectId,
  ): Promise<{ link: string }> {
    let assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");
    if (assessment.selfAssessment.status !== STATUS.SUBMITTED) {
      throw new ConflictError("Self-assessment not submitted yet");
    }
    if (assessment.managerAssessment.status === STATUS.SUBMITTED) {
      throw new ConflictError("Manager rating already submitted");
    }

    if (raterId) {
      if (raterId.equals(assessment.employeeId)) {
        throw new ValidationError("An employee cannot rate themselves");
      }
      const rater = await userRepo.findById(raterId);
      if (!rater) throw new NotFoundError("Rater");
      await assessmentRepo.setLineManager(assessmentId, raterId);
      assessment = await assessmentRepo.findById(assessmentId);
      if (!assessment) throw new NotFoundError("Assessment");
    }

    if (!assessment.lineManagerId) {
      throw new ValidationError("Pick a rater to send this assessment to");
    }
    const link = await this.triggerManagerScoring(assessment);
    if (!link) throw new ValidationError("Could not send the rating link");
    return { link };
  },

  /** Issue a self token and email the employee. Returns the link. */
  async emailSelfLink(
    assessment: Assessment,
    employee: User,
    actorId: ObjectId,
  ): Promise<string> {
    const raw = await tokenService.issueToken(assessment._id, "self", {
      createdBy: actorId,
    });
    const link = appUrl(`/a/${raw}`);
    await sendEmail({
      to: employee.email,
      subject: "Your competency assessment",
      text:
        `Hi ${firstName(employee.fullName)},\n\n` +
        `You've been asked to complete a competency self-assessment. ` +
        `It takes about 30–45 minutes and you can save and resume any time.\n\n` +
        `Open your secure assessment link (do not share it):\n${link}\n\n` +
        `This link is personal to you and expires in 30 days.`,
    });
    return link;
  },

  /**
   * After an employee submits, issue a manager token and email the line
   * manager their secure scoring link. No-op (returns null) when there is no
   * line manager on file.
   */
  async triggerManagerScoring(
    assessment: Assessment,
  ): Promise<string | null> {
    if (!assessment.lineManagerId) return null;
    const [manager, employee] = await Promise.all([
      userRepo.findById(assessment.lineManagerId),
      userRepo.findById(assessment.employeeId),
    ]);
    if (!manager) return null;
    const raw = await tokenService.issueToken(assessment._id, "manager");
    const link = appUrl(`/a/${raw}`);
    await sendEmail({
      to: manager.email,
      subject: `Score a competency assessment: ${employee?.fullName ?? "your report"}`,
      text:
        `Hi ${firstName(manager.fullName)},\n\n` +
        `${employee?.fullName ?? "Your team member"} has completed their ` +
        `self-assessment. Please rate them (1–5) on each competency.\n\n` +
        `Open your secure scoring link (do not share it):\n${link}\n\n` +
        `This link is personal to you and expires in 30 days.`,
    });
    return link;
  },

  /** Compute results only once both sides are submitted. */
  async maybeCompute(assessmentId: ObjectId) {
    const a = await assessmentRepo.findById(assessmentId);
    if (!a) return;
    if (
      a.selfAssessment.status === STATUS.SUBMITTED &&
      a.managerAssessment.status === STATUS.SUBMITTED
    ) {
      await scoringService.computeResults(assessmentId);
    }
  },
};
