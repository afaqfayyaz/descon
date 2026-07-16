import type { ObjectId } from "mongodb";

import { settingsRepo } from "@/lib/db/repositories/settings.repository";
import {
  DEFAULT_GAP_THRESHOLDS,
  DEFAULT_CALIBRATION_THRESHOLDS,
} from "@/lib/domain/constants";
import type { ScoringThresholds } from "@/lib/domain/types/settings.types";

export const DEFAULT_THRESHOLDS: ScoringThresholds = {
  gap: { ...DEFAULT_GAP_THRESHOLDS },
  calibration: { ...DEFAULT_CALIBRATION_THRESHOLDS },
};

export const settingsService = {
  /** Current scoring thresholds, falling back to PRD defaults. */
  async getThresholds(): Promise<ScoringThresholds> {
    const doc = await settingsRepo.getScoring();
    if (!doc) return DEFAULT_THRESHOLDS;
    return {
      gap: { ...DEFAULT_THRESHOLDS.gap, ...doc.thresholds.gap },
      calibration: {
        ...DEFAULT_THRESHOLDS.calibration,
        ...doc.thresholds.calibration,
      },
    };
  },

  /** Whether HR has customised the thresholds away from the defaults. */
  async isCustomised(): Promise<boolean> {
    return (await settingsRepo.getScoring()) !== null;
  },

  async updateThresholds(
    thresholds: ScoringThresholds,
    actorId: ObjectId,
  ): Promise<ScoringThresholds> {
    await settingsRepo.saveScoring(thresholds, actorId);
    return thresholds;
  },

  async resetThresholds(actorId: ObjectId): Promise<ScoringThresholds> {
    await settingsRepo.saveScoring(DEFAULT_THRESHOLDS, actorId);
    return DEFAULT_THRESHOLDS;
  },
};
