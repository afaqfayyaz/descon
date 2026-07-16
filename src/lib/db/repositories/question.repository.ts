import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { Question } from "@/lib/domain/types/framework.types";

type NewQuestion = Omit<Question, "_id">;
type QuestionPatch = Partial<
  Pick<Question, "text" | "options" | "weight" | "sequence" | "isActive" | "version">
> & { updatedAt: Date; updatedBy: ObjectId | null };

export const questionRepo = {
  async findById(id: ObjectId): Promise<Question | null> {
    const db = await getDb();
    return db.collection<Question>(COLLECTIONS.QUESTIONS).findOne({ _id: id });
  },

  async insert(data: NewQuestion): Promise<Question> {
    const db = await getDb();
    const result = await db
      .collection<Question>(COLLECTIONS.QUESTIONS)
      .insertOne(data as Question);
    return { ...(data as Question), _id: result.insertedId };
  },

  async update(id: ObjectId, patch: QuestionPatch): Promise<Question | null> {
    const db = await getDb();
    const result = await db
      .collection<Question>(COLLECTIONS.QUESTIONS)
      .findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: "after" });
    return result ?? null;
  },

  async findBySubCompetency(subCompetencyId: ObjectId): Promise<Question[]> {
    const db = await getDb();
    return db
      .collection<Question>(COLLECTIONS.QUESTIONS)
      .find({ subCompetencyId, isActive: true })
      .sort({ sequence: 1 })
      .toArray();
  },

  /** Fetch a specific set of questions by id (any active state). */
  async findByIds(ids: ObjectId[]): Promise<Question[]> {
    if (ids.length === 0) return [];
    const db = await getDb();
    return db
      .collection<Question>(COLLECTIONS.QUESTIONS)
      .find({ _id: { $in: ids } })
      .toArray();
  },

  /** All active questions for a set of sub-competencies (ordered). */
  async findBySubs(subCompetencyIds: ObjectId[]): Promise<Question[]> {
    if (subCompetencyIds.length === 0) return [];
    const db = await getDb();
    return db
      .collection<Question>(COLLECTIONS.QUESTIONS)
      .find({ subCompetencyId: { $in: subCompetencyIds }, isActive: true })
      .sort({ subCompetencyId: 1, sequence: 1 })
      .toArray();
  },

  /** Count of active questions grouped by sub-competency. */
  async countsForSubs(
    subCompetencyIds: ObjectId[],
  ): Promise<Map<string, number>> {
    if (subCompetencyIds.length === 0) return new Map();
    const db = await getDb();
    const rows = await db
      .collection<Question>(COLLECTIONS.QUESTIONS)
      .aggregate<{ _id: ObjectId; count: number }>([
        {
          $match: {
            subCompetencyId: { $in: subCompetencyIds },
            isActive: true,
          },
        },
        { $group: { _id: "$subCompetencyId", count: { $sum: 1 } } },
      ])
      .toArray();
    return new Map(rows.map((r) => [r._id.toString(), r.count]));
  },

  async insertMany(data: NewQuestion[]): Promise<number> {
    if (data.length === 0) return 0;
    const db = await getDb();
    const result = await db
      .collection<Question>(COLLECTIONS.QUESTIONS)
      .insertMany(data as Question[]);
    return result.insertedCount;
  },

  async deleteAll(): Promise<void> {
    const db = await getDb();
    await db.collection(COLLECTIONS.QUESTIONS).deleteMany({});
  },
};
