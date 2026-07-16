import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { JobFamily } from "@/lib/domain/types/framework.types";

type NewJobFamily = Omit<JobFamily, "_id">;
type JobFamilyPatch = Partial<
  Pick<JobFamily, "name" | "code" | "description" | "status">
> & { updatedAt: Date; updatedBy: ObjectId | null };

export const jobFamilyRepo = {
  async findByCode(code: string): Promise<JobFamily | null> {
    const db = await getDb();
    return db
      .collection<JobFamily>(COLLECTIONS.JOB_FAMILIES)
      .findOne({ code });
  },

  async findById(id: ObjectId): Promise<JobFamily | null> {
    const db = await getDb();
    return db
      .collection<JobFamily>(COLLECTIONS.JOB_FAMILIES)
      .findOne({ _id: id });
  },

  async update(id: ObjectId, patch: JobFamilyPatch): Promise<JobFamily | null> {
    const db = await getDb();
    const result = await db
      .collection<JobFamily>(COLLECTIONS.JOB_FAMILIES)
      .findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: "after" });
    return result ?? null;
  },

  async findAll(): Promise<JobFamily[]> {
    const db = await getDb();
    return db
      .collection<JobFamily>(COLLECTIONS.JOB_FAMILIES)
      .find({ status: { $ne: "archived" } })
      .toArray();
  },

  async insert(data: NewJobFamily): Promise<JobFamily> {
    const db = await getDb();
    const result = await db
      .collection<JobFamily>(COLLECTIONS.JOB_FAMILIES)
      .insertOne(data as JobFamily);
    return { ...(data as JobFamily), _id: result.insertedId };
  },

  async deleteAll(): Promise<void> {
    const db = await getDb();
    await db.collection(COLLECTIONS.JOB_FAMILIES).deleteMany({});
  },
};

export type { ObjectId };
