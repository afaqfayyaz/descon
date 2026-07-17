import type { ClientSession, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { AssessmentResult } from "@/lib/domain/types/assessment.types";

type NewResult = Omit<AssessmentResult, "_id">;

export const assessmentResultRepo = {
  async deleteByAssessment(
    assessmentId: ObjectId,
    session?: ClientSession,
  ): Promise<void> {
    const db = await getDb();
    await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .deleteMany({ assessmentId }, { session });
  },

  async insertMany(
    data: NewResult[],
    session?: ClientSession,
  ): Promise<number> {
    if (data.length === 0) return 0;
    const db = await getDb();
    const result = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .insertMany(data as AssessmentResult[], { session });
    return result.insertedCount;
  },

  async findByAssessment(assessmentId: ObjectId): Promise<AssessmentResult[]> {
    const db = await getDb();
    return db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .find({ assessmentId })
      .toArray();
  },

  async findByCampaign(campaignId: ObjectId): Promise<AssessmentResult[]> {
    const db = await getDb();
    return db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .find({ campaignId })
      .toArray();
  },

  async findByEmployeeAndCampaign(
    employeeId: ObjectId,
    campaignId: ObjectId,
  ): Promise<AssessmentResult[]> {
    const db = await getDb();
    return db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .find({ employeeId, campaignId })
      .toArray();
  },

  async countOutliers(campaignId: ObjectId): Promise<number> {
    const db = await getDb();
    return db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .countDocuments({
        campaignId,
        calibrationFlag: { $in: ["minor_outlier", "major_outlier"] },
      });
  },

  /** Average gap / levels grouped by competency area × division (heatmap). */
  async aggregateByAreaDivision(campaignId: ObjectId): Promise<
    {
      areaId: ObjectId;
      division: string;
      avgGap: number;
      avgManager: number;
      avgRequired: number;
      count: number;
    }[]
  > {
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        { $match: { campaignId, managerLevel: { $ne: null } } },
        {
          $group: {
            _id: {
              areaId: "$denormalized.areaId",
              division: "$denormalized.division",
            },
            avgGap: { $avg: "$gap" },
            avgManager: { $avg: "$managerLevel" },
            avgRequired: { $avg: "$requiredLevel" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      areaId: r._id.areaId as ObjectId,
      division: (r._id.division as string) ?? "—",
      avgGap: r.avgGap as number,
      avgManager: r.avgManager as number,
      avgRequired: r.avgRequired as number,
      count: r.count as number,
    }));
  },

  /** Average gap / levels grouped by competency area (org-wide). */
  async aggregateByArea(campaignId: ObjectId): Promise<
    {
      areaId: ObjectId;
      avgGap: number;
      avgManager: number;
      avgRequired: number;
      count: number;
    }[]
  > {
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        { $match: { campaignId, managerLevel: { $ne: null } } },
        {
          $group: {
            _id: "$denormalized.areaId",
            avgGap: { $avg: "$gap" },
            avgManager: { $avg: "$managerLevel" },
            avgRequired: { $avg: "$requiredLevel" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      areaId: r._id as ObjectId,
      avgGap: r.avgGap as number,
      avgManager: r.avgManager as number,
      avgRequired: r.avgRequired as number,
      count: r.count as number,
    }));
  },

  /** Average gap / levels grouped by designation (role) for a campaign. */
  async aggregateByDesignation(campaignId: ObjectId): Promise<
    {
      designation: ObjectId;
      avgGap: number;
      avgManager: number;
      avgRequired: number;
      count: number;
    }[]
  > {
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        { $match: { campaignId, managerLevel: { $ne: null } } },
        {
          $group: {
            _id: "$denormalized.designation",
            avgGap: { $avg: "$gap" },
            avgManager: { $avg: "$managerLevel" },
            avgRequired: { $avg: "$requiredLevel" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      designation: r._id as ObjectId,
      avgGap: r.avgGap as number,
      avgManager: r.avgManager as number,
      avgRequired: r.avgRequired as number,
      count: r.count as number,
    }));
  },

  /** Per-employee average levels/gap for a campaign (overview + distribution). */
  async aggregateByEmployee(campaignId: ObjectId): Promise<
    {
      employeeId: ObjectId;
      division: string;
      designation: ObjectId;
      avgGap: number;
      avgManager: number;
      avgRequired: number;
      count: number;
    }[]
  > {
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        { $match: { campaignId, managerLevel: { $ne: null } } },
        {
          $group: {
            _id: "$employeeId",
            division: { $first: "$denormalized.division" },
            designation: { $first: "$denormalized.designation" },
            avgGap: { $avg: "$gap" },
            avgManager: { $avg: "$managerLevel" },
            avgRequired: { $avg: "$requiredLevel" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      employeeId: r._id as ObjectId,
      division: (r.division as string) ?? "—",
      designation: r.designation as ObjectId,
      avgGap: r.avgGap as number,
      avgManager: r.avgManager as number,
      avgRequired: r.avgRequired as number,
      count: r.count as number,
    }));
  },

  /** Org-wide totals across a set of campaigns. */
  async overallStatsForCampaigns(campaignIds: ObjectId[]): Promise<{
    count: number;
    avgGap: number;
    avgManager: number;
    avgRequired: number;
    critical: number;
  } | null> {
    if (campaignIds.length === 0) return null;
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        {
          $match: { campaignId: { $in: campaignIds }, managerLevel: { $ne: null } },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgGap: { $avg: "$gap" },
            avgManager: { $avg: "$managerLevel" },
            avgRequired: { $avg: "$requiredLevel" },
            critical: {
              $sum: { $cond: [{ $eq: ["$trafficLight", "critical"] }, 1, 0] },
            },
          },
        },
      ])
      .toArray();
    const r = rows[0];
    if (!r) return null;
    return {
      count: r.count as number,
      avgGap: r.avgGap as number,
      avgManager: r.avgManager as number,
      avgRequired: r.avgRequired as number,
      critical: r.critical as number,
    };
  },

  /** Average gap per sub-competency across campaigns (top capability gaps). */
  async aggregateBySubForCampaigns(campaignIds: ObjectId[]): Promise<
    {
      subCompetencyId: ObjectId;
      avgGap: number;
      avgManager: number;
      avgRequired: number;
      count: number;
    }[]
  > {
    if (campaignIds.length === 0) return [];
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        {
          $match: { campaignId: { $in: campaignIds }, managerLevel: { $ne: null } },
        },
        {
          $group: {
            _id: "$subCompetencyId",
            avgGap: { $avg: "$gap" },
            avgManager: { $avg: "$managerLevel" },
            avgRequired: { $avg: "$requiredLevel" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      subCompetencyId: r._id as ObjectId,
      avgGap: r.avgGap as number,
      avgManager: r.avgManager as number,
      avgRequired: r.avgRequired as number,
      count: r.count as number,
    }));
  },

  /** Average gap per division across campaigns. */
  async aggregateByDivisionForCampaigns(campaignIds: ObjectId[]): Promise<
    {
      division: string;
      avgGap: number;
      avgManager: number;
      critical: number;
      count: number;
    }[]
  > {
    if (campaignIds.length === 0) return [];
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        {
          $match: { campaignId: { $in: campaignIds }, managerLevel: { $ne: null } },
        },
        {
          $group: {
            _id: "$denormalized.division",
            avgGap: { $avg: "$gap" },
            avgManager: { $avg: "$managerLevel" },
            critical: {
              $sum: { $cond: [{ $eq: ["$trafficLight", "critical"] }, 1, 0] },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      division: (r._id as string) ?? "—",
      avgGap: r.avgGap as number,
      avgManager: r.avgManager as number,
      critical: r.critical as number,
      count: r.count as number,
    }));
  },

  /** Average levels/gap grouped by competency area across campaigns. */
  async aggregateByAreaForCampaigns(campaignIds: ObjectId[]): Promise<
    {
      areaId: ObjectId;
      avgGap: number;
      avgManager: number;
      avgRequired: number;
      count: number;
    }[]
  > {
    if (campaignIds.length === 0) return [];
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        {
          $match: { campaignId: { $in: campaignIds }, managerLevel: { $ne: null } },
        },
        {
          $group: {
            _id: "$denormalized.areaId",
            avgGap: { $avg: "$gap" },
            avgManager: { $avg: "$managerLevel" },
            avgRequired: { $avg: "$requiredLevel" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      areaId: r._id as ObjectId,
      avgGap: r.avgGap as number,
      avgManager: r.avgManager as number,
      avgRequired: r.avgRequired as number,
      count: r.count as number,
    }));
  },

  /** Average levels/gap grouped by designation across campaigns. */
  async aggregateByDesignationForCampaigns(campaignIds: ObjectId[]): Promise<
    {
      designation: ObjectId;
      avgGap: number;
      avgManager: number;
      avgRequired: number;
      count: number;
    }[]
  > {
    if (campaignIds.length === 0) return [];
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        {
          $match: { campaignId: { $in: campaignIds }, managerLevel: { $ne: null } },
        },
        {
          $group: {
            _id: "$denormalized.designation",
            avgGap: { $avg: "$gap" },
            avgManager: { $avg: "$managerLevel" },
            avgRequired: { $avg: "$requiredLevel" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      designation: r._id as ObjectId,
      avgGap: r.avgGap as number,
      avgManager: r.avgManager as number,
      avgRequired: r.avgRequired as number,
      count: r.count as number,
    }));
  },

  /** Per-employee average gap across campaigns (org traffic-light spread). */
  async aggregateByEmployeeForCampaigns(campaignIds: ObjectId[]): Promise<
    { employeeId: ObjectId; avgGap: number }[]
  > {
    if (campaignIds.length === 0) return [];
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        {
          $match: { campaignId: { $in: campaignIds }, managerLevel: { $ne: null } },
        },
        { $group: { _id: "$employeeId", avgGap: { $avg: "$gap" } } },
      ])
      .toArray();
    return rows.map((r) => ({
      employeeId: r._id as ObjectId,
      avgGap: r.avgGap as number,
    }));
  },

  /** Per-campaign average gap / manager level (trend across campaigns). */
  async aggregateByCampaign(campaignIds: ObjectId[]): Promise<
    {
      campaignId: ObjectId;
      avgGap: number;
      avgManager: number;
      count: number;
    }[]
  > {
    if (campaignIds.length === 0) return [];
    const db = await getDb();
    const rows = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .aggregate([
        {
          $match: { campaignId: { $in: campaignIds }, managerLevel: { $ne: null } },
        },
        {
          $group: {
            _id: "$campaignId",
            avgGap: { $avg: "$gap" },
            avgManager: { $avg: "$managerLevel" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return rows.map((r) => ({
      campaignId: r._id as ObjectId,
      avgGap: r.avgGap as number,
      avgManager: r.avgManager as number,
      count: r.count as number,
    }));
  },

  /** Freeze all results in a campaign (called when the campaign is locked). */
  async lockByCampaign(campaignId: ObjectId): Promise<number> {
    const db = await getDb();
    const res = await db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .updateMany(
        { campaignId },
        { $set: { status: "locked", updatedAt: new Date() } },
      );
    return res.modifiedCount;
  },

  /** All calibration outliers in a campaign (for the workshop review list). */
  async findOutliers(campaignId: ObjectId): Promise<AssessmentResult[]> {
    const db = await getDb();
    return db
      .collection<AssessmentResult>(COLLECTIONS.ASSESSMENT_RESULTS)
      .find({
        campaignId,
        calibrationFlag: { $in: ["minor_outlier", "major_outlier"] },
      })
      .toArray();
  },
};
