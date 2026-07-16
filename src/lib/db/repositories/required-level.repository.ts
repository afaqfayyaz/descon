import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { RequiredLevel } from "@/lib/domain/types/framework.types";

type NewRequiredLevel = Omit<RequiredLevel, "_id">;

export const requiredLevelRepo = {
  /** Current required level for a sub-competency × role (effectiveTo === null). */
  async findCurrent(
    subCompetencyId: ObjectId,
    roleId: ObjectId,
  ): Promise<RequiredLevel | null> {
    const db = await getDb();
    return db
      .collection<RequiredLevel>(COLLECTIONS.REQUIRED_LEVELS)
      .findOne({ subCompetencyId, roleId, effectiveTo: null });
  },

  /** All currently-active required levels for a set of sub-competencies. */
  async findCurrentForSubs(
    subCompetencyIds: ObjectId[],
  ): Promise<RequiredLevel[]> {
    if (subCompetencyIds.length === 0) return [];
    const db = await getDb();
    return db
      .collection<RequiredLevel>(COLLECTIONS.REQUIRED_LEVELS)
      .find({ subCompetencyId: { $in: subCompetencyIds }, effectiveTo: null })
      .toArray();
  },

  async insertMany(data: NewRequiredLevel[]): Promise<number> {
    if (data.length === 0) return 0;
    const db = await getDb();
    const result = await db
      .collection<RequiredLevel>(COLLECTIONS.REQUIRED_LEVELS)
      .insertMany(data as RequiredLevel[]);
    return result.insertedCount;
  },

  async insert(data: NewRequiredLevel): Promise<RequiredLevel> {
    const db = await getDb();
    const result = await db
      .collection<RequiredLevel>(COLLECTIONS.REQUIRED_LEVELS)
      .insertOne(data as RequiredLevel);
    return { ...(data as RequiredLevel), _id: result.insertedId };
  },

  /** Close the current required level for a sub × role (set effectiveTo=now). */
  async closeCurrent(
    subCompetencyId: ObjectId,
    roleId: ObjectId,
    when: Date,
    actorId: ObjectId | null,
  ): Promise<void> {
    const db = await getDb();
    await db
      .collection<RequiredLevel>(COLLECTIONS.REQUIRED_LEVELS)
      .updateMany(
        { subCompetencyId, roleId, effectiveTo: null },
        { $set: { effectiveTo: when, updatedAt: when, updatedBy: actorId } },
      );
  },

  /** Count current required-level rows referencing a sub-competency. */
  async countCurrentForSub(subCompetencyId: ObjectId): Promise<number> {
    const db = await getDb();
    return db
      .collection<RequiredLevel>(COLLECTIONS.REQUIRED_LEVELS)
      .countDocuments({ subCompetencyId, effectiveTo: null });
  },

  async deleteAll(): Promise<void> {
    const db = await getDb();
    await db.collection(COLLECTIONS.REQUIRED_LEVELS).deleteMany({});
  },
};
