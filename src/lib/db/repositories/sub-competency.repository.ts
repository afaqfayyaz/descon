import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { SubCompetency } from "@/lib/domain/types/framework.types";

type NewSubCompetency = Omit<SubCompetency, "_id">;
type SubPatch = Partial<
  Pick<
    SubCompetency,
    | "name"
    | "code"
    | "description"
    | "behavioralIndicators"
    | "sequence"
    | "isActive"
  >
> & { updatedAt: Date; updatedBy: ObjectId | null };

export const subCompetencyRepo = {
  async findById(id: ObjectId): Promise<SubCompetency | null> {
    const db = await getDb();
    return db
      .collection<SubCompetency>(COLLECTIONS.SUB_COMPETENCIES)
      .findOne({ _id: id });
  },

  async findByCode(
    areaId: ObjectId,
    code: string,
  ): Promise<SubCompetency | null> {
    const db = await getDb();
    return db
      .collection<SubCompetency>(COLLECTIONS.SUB_COMPETENCIES)
      .findOne({ areaId, code, isActive: true });
  },

  async update(id: ObjectId, patch: SubPatch): Promise<SubCompetency | null> {
    const db = await getDb();
    const result = await db
      .collection<SubCompetency>(COLLECTIONS.SUB_COMPETENCIES)
      .findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: "after" });
    return result ?? null;
  },

  async findByArea(areaId: ObjectId): Promise<SubCompetency[]> {
    const db = await getDb();
    return db
      .collection<SubCompetency>(COLLECTIONS.SUB_COMPETENCIES)
      .find({ areaId, isActive: true })
      .sort({ sequence: 1 })
      .toArray();
  },

  async findByAreas(areaIds: ObjectId[]): Promise<SubCompetency[]> {
    if (areaIds.length === 0) return [];
    const db = await getDb();
    return db
      .collection<SubCompetency>(COLLECTIONS.SUB_COMPETENCIES)
      .find({ areaId: { $in: areaIds }, isActive: true })
      .toArray();
  },

  async findByIds(ids: ObjectId[]): Promise<SubCompetency[]> {
    if (ids.length === 0) return [];
    const db = await getDb();
    return db
      .collection<SubCompetency>(COLLECTIONS.SUB_COMPETENCIES)
      .find({ _id: { $in: ids } })
      .toArray();
  },

  async insert(data: NewSubCompetency): Promise<SubCompetency> {
    const db = await getDb();
    const result = await db
      .collection<SubCompetency>(COLLECTIONS.SUB_COMPETENCIES)
      .insertOne(data as SubCompetency);
    return { ...(data as SubCompetency), _id: result.insertedId };
  },

  async deleteAll(): Promise<void> {
    const db = await getDb();
    await db.collection(COLLECTIONS.SUB_COMPETENCIES).deleteMany({});
  },
};
