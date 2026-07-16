import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { AssessmentCampaign } from "@/lib/domain/types/assessment.types";
import type { CampaignStatus } from "@/lib/domain/constants";

type NewCampaign = Omit<AssessmentCampaign, "_id">;

export const campaignRepo = {
  async findById(id: ObjectId): Promise<AssessmentCampaign | null> {
    const db = await getDb();
    return db
      .collection<AssessmentCampaign>(COLLECTIONS.ASSESSMENT_CAMPAIGNS)
      .findOne({ _id: id });
  },

  async findAll(): Promise<AssessmentCampaign[]> {
    const db = await getDb();
    return db
      .collection<AssessmentCampaign>(COLLECTIONS.ASSESSMENT_CAMPAIGNS)
      .find({ status: { $ne: "archived" } })
      .sort({ startDate: -1 })
      .toArray();
  },

  async insert(data: NewCampaign): Promise<AssessmentCampaign> {
    const db = await getDb();
    const result = await db
      .collection<AssessmentCampaign>(COLLECTIONS.ASSESSMENT_CAMPAIGNS)
      .insertOne(data as AssessmentCampaign);
    return { ...(data as AssessmentCampaign), _id: result.insertedId };
  },

  async setStatus(
    id: ObjectId,
    status: CampaignStatus,
    actorId: ObjectId,
  ): Promise<void> {
    const db = await getDb();
    await db
      .collection<AssessmentCampaign>(COLLECTIONS.ASSESSMENT_CAMPAIGNS)
      .updateOne(
        { _id: id },
        { $set: { status, updatedAt: new Date(), updatedBy: actorId } },
      );
  },

  async setDeadlines(
    id: ObjectId,
    deadlines: Partial<
      Pick<
        AssessmentCampaign,
        | "selfAssessmentDeadline"
        | "managerAssessmentDeadline"
        | "calibrationDeadline"
      >
    >,
    actorId: ObjectId,
  ): Promise<void> {
    const db = await getDb();
    await db
      .collection<AssessmentCampaign>(COLLECTIONS.ASSESSMENT_CAMPAIGNS)
      .updateOne(
        { _id: id },
        { $set: { ...deadlines, updatedAt: new Date(), updatedBy: actorId } },
      );
  },

  async updateStats(
    id: ObjectId,
    stats: Partial<AssessmentCampaign["stats"]>,
  ): Promise<void> {
    const db = await getDb();
    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(stats)) set[`stats.${k}`] = v;
    await db
      .collection<AssessmentCampaign>(COLLECTIONS.ASSESSMENT_CAMPAIGNS)
      .updateOne({ _id: id }, { $set: set });
  },
};
