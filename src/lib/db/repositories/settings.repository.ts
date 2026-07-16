import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { AppSettings, ScoringThresholds } from "@/lib/domain/types/settings.types";

const SCORING_KEY = "scoring" as const;

export const settingsRepo = {
  async getScoring(): Promise<AppSettings | null> {
    const db = await getDb();
    return db
      .collection<AppSettings>(COLLECTIONS.SETTINGS)
      .findOne({ key: SCORING_KEY });
  },

  async saveScoring(
    thresholds: ScoringThresholds,
    updatedBy: ObjectId | null,
  ): Promise<void> {
    const db = await getDb();
    await db.collection<AppSettings>(COLLECTIONS.SETTINGS).updateOne(
      { key: SCORING_KEY },
      { $set: { thresholds, updatedAt: new Date(), updatedBy } },
      { upsert: true },
    );
  },
};
