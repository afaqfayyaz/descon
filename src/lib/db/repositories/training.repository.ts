import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type {
  Training,
  TrainingAssignment,
} from "@/lib/domain/types/training.types";

type NewTraining = Omit<Training, "_id">;
type TrainingPatch = Partial<
  Pick<
    Training,
    | "name"
    | "description"
    | "type"
    | "durationHours"
    | "provider"
    | "url"
    | "addressesSubCompetencies"
    | "isActive"
  >
> & { updatedAt: Date; updatedBy: ObjectId | null };

export const trainingRepo = {
  async findById(id: ObjectId): Promise<Training | null> {
    const db = await getDb();
    return db.collection<Training>(COLLECTIONS.TRAININGS).findOne({ _id: id });
  },

  async findActive(): Promise<Training[]> {
    const db = await getDb();
    return db
      .collection<Training>(COLLECTIONS.TRAININGS)
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();
  },

  async insert(data: NewTraining): Promise<Training> {
    const db = await getDb();
    const result = await db
      .collection<Training>(COLLECTIONS.TRAININGS)
      .insertOne(data as Training);
    return { ...(data as Training), _id: result.insertedId };
  },

  async update(id: ObjectId, patch: TrainingPatch): Promise<Training | null> {
    const db = await getDb();
    const result = await db
      .collection<Training>(COLLECTIONS.TRAININGS)
      .findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: "after" });
    return result ?? null;
  },

  async pushAssignment(
    id: ObjectId,
    assignment: TrainingAssignment,
    updatedBy: ObjectId | null,
  ): Promise<void> {
    const db = await getDb();
    await db.collection<Training>(COLLECTIONS.TRAININGS).updateOne(
      { _id: id },
      {
        $push: { assignments: assignment },
        $set: { updatedAt: new Date(), updatedBy },
      },
    );
  },

  async setAssignmentStatus(
    id: ObjectId,
    employeeId: ObjectId,
    assignedAt: Date,
    status: TrainingAssignment["status"],
    completedAt: Date | null,
    updatedBy: ObjectId | null,
  ): Promise<void> {
    const db = await getDb();
    await db.collection<Training>(COLLECTIONS.TRAININGS).updateOne(
      { _id: id, "assignments.employeeId": employeeId, "assignments.assignedAt": assignedAt },
      {
        $set: {
          "assignments.$.status": status,
          "assignments.$.completedAt": completedAt,
          updatedAt: new Date(),
          updatedBy,
        },
      },
    );
  },
};
