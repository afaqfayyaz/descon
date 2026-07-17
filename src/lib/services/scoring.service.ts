import { ObjectId } from "mongodb";

import { getClient } from "@/lib/db/client";
import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { assessmentResultRepo } from "@/lib/db/repositories/assessment-result.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { questionRepo } from "@/lib/db/repositories/question.repository";
import { requiredLevelRepo } from "@/lib/db/repositories/required-level.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { settingsService } from "@/lib/services/settings.service";

import {
  calculateSelfLevel,
  round2,
  type ScoringAnswer,
} from "@/lib/domain/scoring/self-level";
import { isSubInScope, normalizeScope } from "@/lib/domain/scope";
import { calculateGap, getTrafficLight } from "@/lib/domain/scoring/gap";
import {
  calculateDifference,
  getCalibrationFlag,
} from "@/lib/domain/scoring/calibration";
import type { Question } from "@/lib/domain/types/framework.types";
import type {
  Assessment,
  AssessmentResult,
} from "@/lib/domain/types/assessment.types";
import {
  CALIBRATION_FLAG,
  FINAL_STATUS,
  type CalibrationFlag,
  type TrafficLight,
} from "@/lib/domain/constants";
import { NotFoundError } from "@/lib/utils/errors";

export interface ResultRow {
  subCompetencyId: string;
  areaId: string;
  subCode: string;
  subName: string;
  selfLevel: number | null;
  managerLevel: number | null;
  requiredLevel: number | null;
  gap: number | null;
  trafficLight: TrafficLight | null;
  difference: number | null;
  calibrationFlag: CalibrationFlag | null;
}

/**
 * Pure(ish) row builder shared by the persisted compute path and the
 * read-only preview path. Works whether or not the manager has rated yet —
 * `managerLevel`/`gap`/etc. simply come back null until they have.
 */
async function buildRows(
  assessment: Assessment,
): Promise<{ rows: ResultRow[]; docs: Omit<AssessmentResult, "_id">[] }> {
  const employee = await userRepo.findById(assessment.employeeId);
    const thresholds = await settingsService.getThresholds();
    const jobFamilyId = assessment.jobFamilyAtCampaign;
    const designation = assessment.designationAtCampaign;

    // Framework structure (restricted to the test's scope).
    const scope = normalizeScope(assessment.scope);
    const areas = await competencyAreaRepo.findByJobFamily(jobFamilyId);
    const subsByArea = await Promise.all(
      areas.map((a) => subCompetencyRepo.findByArea(a._id)),
    );
    const subs = subsByArea
      .flat()
      .filter((s) => isSubInScope(scope, s._id.toString()));
    const subIds = subs.map((s) => s._id);

    const [questions, requiredLevels] = await Promise.all([
      questionRepo.findBySubs(subIds),
      requiredLevelRepo.findCurrentForSubs(subIds),
    ]);

    // questionId -> sub, and sub -> questions[]
    const questionsBySub = new Map<string, Question[]>();
    for (const q of questions) {
      const key = q.subCompetencyId.toString();
      if (!questionsBySub.has(key)) questionsBySub.set(key, []);
      questionsBySub.get(key)!.push(q);
    }

    // required level for the employee's designation
    const requiredBySub = new Map<string, number>();
    for (const rl of requiredLevels) {
      if (rl.roleId.toString() === designation.toString()) {
        requiredBySub.set(rl.subCompetencyId.toString(), rl.requiredLevel);
      }
    }

    // self answers: questionId -> selectedOption
    const answerByQuestion = new Map<string, string>();
    for (const a of assessment.selfAssessment.answers) {
      answerByQuestion.set(a.questionId.toString(), a.selectedOption);
    }

    // manager ratings: subId -> rating
    const ratingBySub = new Map<string, number>();
    for (const r of assessment.managerAssessment.ratings) {
      ratingBySub.set(r.subCompetencyId.toString(), r.rating);
    }

    // calibration overrides: subId -> { adjustedLevel, note }
    const adjustmentBySub = new Map<
      string,
      { adjustedLevel: number; note: string | null }
    >();
    for (const adj of assessment.calibrationAdjustments ?? []) {
      adjustmentBySub.set(adj.subCompetencyId.toString(), {
        adjustedLevel: adj.adjustedLevel,
        note: adj.note,
      });
    }

    const now = new Date();
    const rows: ResultRow[] = [];
    const docs: Omit<AssessmentResult, "_id">[] = [];

    for (const sub of subs) {
      const subKey = sub._id.toString();
      const subQuestions = questionsBySub.get(subKey) ?? [];

      // self level
      const scoringQuestions = subQuestions.map((q) => ({
        options: q.options,
        weight: q.weight ?? 1,
      }));
      const scoringAnswers: ScoringAnswer[] = [];
      subQuestions.forEach((q, i) => {
        const sel = answerByQuestion.get(q._id.toString());
        if (sel) scoringAnswers.push({ questionIndex: i, selectedOption: sel });
      });
      const selfLevel = calculateSelfLevel(scoringQuestions, scoringAnswers);

      const adjustment = adjustmentBySub.get(subKey);
      const managerLevel =
        adjustment?.adjustedLevel ?? ratingBySub.get(subKey) ?? null;
      const requiredLevel = requiredBySub.get(subKey) ?? null;

      const difference =
        selfLevel !== null && managerLevel !== null
          ? round2(calculateDifference(selfLevel, managerLevel))
          : null;

      const gap =
        requiredLevel !== null && managerLevel !== null
          ? round2(calculateGap(requiredLevel, managerLevel))
          : null;

      const trafficLight =
        gap !== null ? getTrafficLight(gap, thresholds.gap) : null;
      const calibrationFlag =
        difference !== null
          ? getCalibrationFlag(difference, thresholds.calibration)
          : null;

      rows.push({
        subCompetencyId: subKey,
        areaId: sub.areaId.toString(),
        subCode: sub.code,
        subName: sub.name,
        selfLevel,
        managerLevel,
        requiredLevel,
        gap,
        trafficLight,
        difference,
        calibrationFlag,
      });

      docs.push({
        assessmentId: assessment._id,
        campaignId: assessment.campaignId,
        employeeId: assessment.employeeId,
        subCompetencyId: sub._id,
        selfLevel,
        managerLevel,
        difference,
        requiredLevel: requiredLevel ?? 0,
        gap,
        trafficLight,
        calibrationFlag,
        calibrationNote: adjustment?.note ?? null,
        computedAt: now,
        status: "computed",
        denormalized: {
          division: employee?.division ?? "",
          department: employee?.department ?? null,
          designation,
          jobFamily: jobFamilyId,
          areaId: sub.areaId,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    return { rows, docs };
}

export const scoringService = {
  /**
   * Compute per-sub-competency results for one assessment and persist them to
   * `assessmentResults`. Recomputes idempotently (clears prior rows first).
   * Sets the assessment's finalStatus and refreshes campaign stats. Call only
   * once both sides have submitted (see assessmentService.maybeCompute).
   */
  async computeResults(assessmentId: ObjectId): Promise<ResultRow[]> {
    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");

    const { rows, docs } = await buildRows(assessment);

    // Replace the persisted rows atomically: a crash between delete and insert
    // must not leave a finalized assessment with no results. Transactions need
    // a replica set (Atlas has one; a standalone local Mongo doesn't), so fall
    // back to the sequential path when they're unsupported.
    const client = await getClient();
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await assessmentResultRepo.deleteByAssessment(assessment._id, session);
        await assessmentResultRepo.insertMany(docs, session);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/Transaction numbers|replica set|sessions are not supported/i.test(message)) {
        throw error;
      }
      await assessmentResultRepo.deleteByAssessment(assessment._id);
      await assessmentResultRepo.insertMany(docs);
    } finally {
      await session.endSession();
    }

    const hasOutliers = rows.some(
      (r) =>
        r.calibrationFlag === CALIBRATION_FLAG.MINOR_OUTLIER ||
        r.calibrationFlag === CALIBRATION_FLAG.MAJOR_OUTLIER,
    );
    await assessmentRepo.setFinalStatus(
      assessment._id,
      hasOutliers
        ? FINAL_STATUS.CALIBRATION_REQUIRED
        : FINAL_STATUS.FINALIZED,
    );

    await this.refreshCampaignStats(assessment.campaignId);

    return rows;
  },

  /**
   * Read-only, non-persisting preview of the same rows — usable at any point
   * in the flow (self-only, manager-only, or both) so HR can see a
   * self-assessment's levels before the manager has rated. Never touches
   * `assessmentResults` or `finalStatus`.
   */
  async previewRows(assessmentId: ObjectId): Promise<ResultRow[]> {
    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");
    const { rows } = await buildRows(assessment);
    return rows;
  },

  /** Recompute denormalized campaign stats from the assessments + results. */
  async refreshCampaignStats(campaignId: ObjectId): Promise<void> {
    const assessments = await assessmentRepo.findByCampaign(campaignId);
    const selfCompleted = assessments.filter(
      (a) => a.selfAssessment.status === "submitted",
    ).length;
    const managerCompleted = assessments.filter(
      (a) => a.managerAssessment.status === "submitted",
    ).length;
    const finalized = assessments.filter(
      (a) => a.finalStatus === FINAL_STATUS.FINALIZED,
    ).length;
    const calibrationOutliers =
      await assessmentResultRepo.countOutliers(campaignId);

    await campaignRepo.updateStats(campaignId, {
      selfCompleted,
      managerCompleted,
      finalized,
      calibrationOutliers,
    });
  },
};
