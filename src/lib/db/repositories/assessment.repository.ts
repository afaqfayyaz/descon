import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type {
  Assessment,
  CalibrationAdjustment,
  ManagerRating,
  SelfAnswer,
} from "@/lib/domain/types/assessment.types";
import { STATUS } from "@/lib/domain/constants";
import type { FinalStatus, SideStatus } from "@/lib/domain/constants";

type NewAssessment = Omit<Assessment, "_id">;

export const assessmentRepo = {
  async findById(id: ObjectId): Promise<Assessment | null> {
    const db = await getDb();
    return db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .findOne({ _id: id });
  },

  async findByCampaignAndEmployee(
    campaignId: ObjectId,
    employeeId: ObjectId,
  ): Promise<Assessment | null> {
    const db = await getDb();
    return db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .findOne({ campaignId, employeeId });
  },

  async findForEmployee(employeeId: ObjectId): Promise<Assessment[]> {
    const db = await getDb();
    return db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .find({ employeeId })
      .toArray();
  },

  /** The employee's most recently created assessment (any status), or null. */
  async findLatestForEmployee(employeeId: ObjectId): Promise<Assessment | null> {
    const db = await getDb();
    return db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
  },

  /** Every assessment still awaiting a self submission or a manager rating. */
  async findUnfinished(): Promise<Assessment[]> {
    const db = await getDb();
    return db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .find({
        $or: [
          { "selfAssessment.status": { $ne: STATUS.SUBMITTED } },
          { "managerAssessment.status": { $ne: STATUS.SUBMITTED } },
        ],
      })
      .toArray();
  },

  async findForManager(lineManagerId: ObjectId): Promise<Assessment[]> {
    const db = await getDb();
    return db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .find({ lineManagerId })
      .toArray();
  },

  async findByCampaign(campaignId: ObjectId): Promise<Assessment[]> {
    const db = await getDb();
    return db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .find({ campaignId })
      .toArray();
  },

  async findByCampaigns(campaignIds: ObjectId[]): Promise<Assessment[]> {
    if (campaignIds.length === 0) return [];
    const db = await getDb();
    return db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .find({ campaignId: { $in: campaignIds } })
      .toArray();
  },

  async insertMany(data: NewAssessment[]): Promise<number> {
    if (data.length === 0) return 0;
    const db = await getDb();
    const result = await db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .insertMany(data as Assessment[]);
    return result.insertedCount;
  },

  /** Replace (or insert) a single self answer, keyed by questionId. */
  async upsertSelfAnswer(id: ObjectId, answer: SelfAnswer): Promise<void> {
    const db = await getDb();
    const coll = db.collection<Assessment>(COLLECTIONS.ASSESSMENTS);
    await coll.updateOne(
      { _id: id },
      // remove any previous answer for this question
      { $pull: { "selfAssessment.answers": { questionId: answer.questionId } } },
    );
    await coll.updateOne(
      { _id: id },
      {
        $push: { "selfAssessment.answers": answer },
        $set: {
          "selfAssessment.status": "in_progress",
          updatedAt: new Date(),
        },
        $setOnInsert: {},
      },
    );
  },

  /** Replace (or insert) a single manager rating, keyed by subCompetencyId. */
  async upsertManagerRating(
    id: ObjectId,
    rating: ManagerRating,
  ): Promise<void> {
    const db = await getDb();
    const coll = db.collection<Assessment>(COLLECTIONS.ASSESSMENTS);
    await coll.updateOne(
      { _id: id },
      {
        $pull: {
          "managerAssessment.ratings": {
            subCompetencyId: rating.subCompetencyId,
          },
        },
      },
    );
    await coll.updateOne(
      { _id: id },
      {
        $push: { "managerAssessment.ratings": rating },
        $set: {
          "managerAssessment.status": "in_progress",
          updatedAt: new Date(),
        },
      },
    );
  },

  /** Replace (or insert) a calibration adjustment, keyed by subCompetencyId. */
  async upsertCalibrationAdjustment(
    id: ObjectId,
    adjustment: CalibrationAdjustment,
  ): Promise<void> {
    const db = await getDb();
    const coll = db.collection<Assessment>(COLLECTIONS.ASSESSMENTS);
    await coll.updateOne(
      { _id: id },
      {
        $pull: {
          calibrationAdjustments: {
            subCompetencyId: adjustment.subCompetencyId,
          },
        },
      },
    );
    await coll.updateOne(
      { _id: id },
      {
        $push: { calibrationAdjustments: adjustment },
        $set: { updatedAt: new Date() },
      },
    );
  },

  async setSelfProgress(id: ObjectId, progress: number): Promise<void> {
    const db = await getDb();
    await db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .updateOne(
        { _id: id },
        { $set: { "selfAssessment.progress": progress, updatedAt: new Date() } },
      );
  },

  async setManagerProgress(id: ObjectId, progress: number): Promise<void> {
    const db = await getDb();
    await db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .updateOne(
        { _id: id },
        {
          $set: {
            "managerAssessment.progress": progress,
            updatedAt: new Date(),
          },
        },
      );
  },

  async setSelfStatus(
    id: ObjectId,
    status: SideStatus,
    fields: Partial<{ startedAt: Date; submittedAt: Date; progress: number }> = {},
  ): Promise<void> {
    const db = await getDb();
    const set: Record<string, unknown> = {
      "selfAssessment.status": status,
      updatedAt: new Date(),
    };
    if (fields.startedAt) set["selfAssessment.startedAt"] = fields.startedAt;
    if (fields.submittedAt) set["selfAssessment.submittedAt"] = fields.submittedAt;
    if (fields.progress !== undefined) set["selfAssessment.progress"] = fields.progress;
    await db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .updateOne({ _id: id }, { $set: set });
  },

  /** Reassign who rates this assessment (chosen at send time by HR). */
  async setLineManager(id: ObjectId, lineManagerId: ObjectId): Promise<void> {
    const db = await getDb();
    await db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .updateOne({ _id: id }, { $set: { lineManagerId, updatedAt: new Date() } });
  },

  async setManagerStatus(
    id: ObjectId,
    status: SideStatus,
    fields: Partial<{ startedAt: Date; submittedAt: Date; progress: number }> = {},
  ): Promise<void> {
    const db = await getDb();
    const set: Record<string, unknown> = {
      "managerAssessment.status": status,
      updatedAt: new Date(),
    };
    if (fields.startedAt) set["managerAssessment.startedAt"] = fields.startedAt;
    if (fields.submittedAt)
      set["managerAssessment.submittedAt"] = fields.submittedAt;
    if (fields.progress !== undefined)
      set["managerAssessment.progress"] = fields.progress;
    await db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .updateOne({ _id: id }, { $set: set });
  },

  async setFinalStatus(
    id: ObjectId,
    finalStatus: FinalStatus,
    finalizedBy?: ObjectId,
  ): Promise<void> {
    const db = await getDb();
    const set: Record<string, unknown> = {
      finalStatus,
      updatedAt: new Date(),
    };
    if (finalStatus === "finalized") {
      set.finalizedAt = new Date();
      if (finalizedBy) set.finalizedBy = finalizedBy;
    }
    await db
      .collection<Assessment>(COLLECTIONS.ASSESSMENTS)
      .updateOne({ _id: id }, { $set: set });
  },
};
