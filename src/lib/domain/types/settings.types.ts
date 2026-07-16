import type { ObjectId } from "mongodb";
import type { GapThresholds } from "@/lib/domain/scoring/gap";
import type { CalibrationThresholds } from "@/lib/domain/scoring/calibration";

/** Tunable scoring thresholds (HR-configurable). */
export interface ScoringThresholds {
  gap: GapThresholds;
  calibration: CalibrationThresholds;
}

/** Singleton settings document. */
export interface AppSettings {
  _id: ObjectId;
  key: "scoring";
  thresholds: ScoringThresholds;
  updatedAt: Date;
  updatedBy: ObjectId | null;
}
