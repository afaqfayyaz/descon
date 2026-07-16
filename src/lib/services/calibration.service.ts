import { ObjectId } from "mongodb";

import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { scoringService } from "@/lib/services/scoring.service";
import { CAMPAIGN_STATUS } from "@/lib/domain/constants";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/utils/errors";

export const calibrationService = {
  /**
   * Apply a calibration override to one sub-competency rating, preserving the
   * manager's original value for audit, then recompute the assessment's results.
   * Only permitted while the campaign is in the calibration phase.
   */
  async adjustRating(
    assessmentId: ObjectId,
    subCompetencyId: ObjectId,
    adjustedLevel: number,
    note: string | null,
    actorId: ObjectId,
  ) {
    if (!Number.isInteger(adjustedLevel) || adjustedLevel < 1 || adjustedLevel > 5) {
      throw new ValidationError("Adjusted level must be an integer 1–5");
    }

    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");

    const campaign = await campaignRepo.findById(assessment.campaignId);
    if (!campaign) throw new NotFoundError("Campaign");
    if (campaign.status !== CAMPAIGN_STATUS.IN_CALIBRATION) {
      throw new ConflictError(
        "Calibration adjustments are only allowed while the campaign is in calibration",
      );
    }

    const original =
      assessment.managerAssessment.ratings.find((r) =>
        r.subCompetencyId.equals(subCompetencyId),
      )?.rating ?? null;

    await assessmentRepo.upsertCalibrationAdjustment(assessmentId, {
      subCompetencyId,
      originalLevel: original,
      adjustedLevel,
      note: note?.trim() || null,
      adjustedBy: actorId,
      adjustedAt: new Date(),
    });

    await scoringService.computeResults(assessmentId);
    return { ok: true };
  },
};
