import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { CompetencyArea } from "@/lib/domain/types/framework.types";

type NewArea = Omit<CompetencyArea, "_id">;
type AreaPatch = Partial<
  Pick<
    CompetencyArea,
    "name" | "code" | "description" | "sequence" | "weight" | "isActive"
  >
> & { updatedAt: Date; updatedBy: ObjectId | null };

export const competencyAreaRepo = {
  async findById(id: ObjectId): Promise<CompetencyArea | null> {
    const db = await getDb();
    return db
      .collection<CompetencyArea>(COLLECTIONS.COMPETENCY_AREAS)
      .findOne({ _id: id });
  },

  async findByCode(
    jobFamilyId: ObjectId,
    code: string,
  ): Promise<CompetencyArea | null> {
    const db = await getDb();
    return db
      .collection<CompetencyArea>(COLLECTIONS.COMPETENCY_AREAS)
      .findOne({ jobFamilyId, code, isActive: true });
  },

  async findByJobFamily(jobFamilyId: ObjectId): Promise<CompetencyArea[]> {
    const db = await getDb();
    return db
      .collection<CompetencyArea>(COLLECTIONS.COMPETENCY_AREAS)
      .find({ jobFamilyId, isActive: true })
      .sort({ sequence: 1 })
      .toArray();
  },

  async findByIds(ids: ObjectId[]): Promise<CompetencyArea[]> {
    if (ids.length === 0) return [];
    const db = await getDb();
    return db
      .collection<CompetencyArea>(COLLECTIONS.COMPETENCY_AREAS)
      .find({ _id: { $in: ids } })
      .sort({ sequence: 1 })
      .toArray();
  },

  async insert(data: NewArea): Promise<CompetencyArea> {
    const db = await getDb();
    const result = await db
      .collection<CompetencyArea>(COLLECTIONS.COMPETENCY_AREAS)
      .insertOne(data as CompetencyArea);
    return { ...(data as CompetencyArea), _id: result.insertedId };
  },

  async update(id: ObjectId, patch: AreaPatch): Promise<CompetencyArea | null> {
    const db = await getDb();
    const result = await db
      .collection<CompetencyArea>(COLLECTIONS.COMPETENCY_AREAS)
      .findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: "after" });
    return result ?? null;
  },

  async deleteAll(): Promise<void> {
    const db = await getDb();
    await db.collection(COLLECTIONS.COMPETENCY_AREAS).deleteMany({});
  },
};
