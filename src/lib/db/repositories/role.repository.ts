import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { Role } from "@/lib/domain/types/framework.types";

type NewRole = Omit<Role, "_id">;
type RolePatch = Partial<
  Pick<Role, "name" | "code" | "level" | "description" | "isActive">
> & { updatedAt: Date; updatedBy: ObjectId | null };

export const roleRepo = {
  async findById(id: ObjectId): Promise<Role | null> {
    const db = await getDb();
    return db.collection<Role>(COLLECTIONS.ROLES).findOne({ _id: id });
  },

  async findByCode(code: string): Promise<Role | null> {
    const db = await getDb();
    return db.collection<Role>(COLLECTIONS.ROLES).findOne({ code });
  },

  async findAll(): Promise<Role[]> {
    const db = await getDb();
    return db
      .collection<Role>(COLLECTIONS.ROLES)
      .find({ isActive: true })
      .sort({ level: 1 })
      .toArray();
  },

  async insert(data: NewRole): Promise<Role> {
    const db = await getDb();
    const result = await db
      .collection<Role>(COLLECTIONS.ROLES)
      .insertOne(data as Role);
    return { ...(data as Role), _id: result.insertedId };
  },

  async update(id: ObjectId, patch: RolePatch): Promise<Role | null> {
    const db = await getDb();
    const result = await db
      .collection<Role>(COLLECTIONS.ROLES)
      .findOneAndUpdate({ _id: id }, { $set: patch }, { returnDocument: "after" });
    return result ?? null;
  },

  async deleteAll(): Promise<void> {
    const db = await getDb();
    await db.collection(COLLECTIONS.ROLES).deleteMany({});
  },
};
