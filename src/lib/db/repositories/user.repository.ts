import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { User } from "@/lib/domain/types/user.types";
import type { SystemRole } from "@/lib/domain/constants";

type NewUser = Omit<User, "_id">;
type UserPatch = Partial<
  Pick<
    User,
    | "fullName"
    | "email"
    | "employeeCode"
    | "designation"
    | "division"
    | "department"
    | "jobFamily"
    | "lineManagerId"
    | "systemRoles"
    | "phoneNumber"
    | "isActive"
  >
> & { updatedAt: Date; updatedBy: ObjectId | null };

export interface UserFilters {
  search?: string;
  division?: string;
  jobFamilyId?: ObjectId;
  /** Filter to users holding this system role (directory category tabs). */
  role?: SystemRole;
}

export const userRepo = {
  async findById(id: ObjectId): Promise<User | null> {
    const db = await getDb();
    return db
      .collection<User>(COLLECTIONS.USERS)
      .findOne({ _id: id, isActive: true });
  },

  /** Find by id regardless of active state (for admin editing). */
  async findByIdAny(id: ObjectId): Promise<User | null> {
    const db = await getDb();
    return db.collection<User>(COLLECTIONS.USERS).findOne({ _id: id });
  },

  async findByEmployeeCode(code: string): Promise<User | null> {
    const db = await getDb();
    return db.collection<User>(COLLECTIONS.USERS).findOne({ employeeCode: code });
  },

  async findByEmail(email: string): Promise<User | null> {
    const db = await getDb();
    return db
      .collection<User>(COLLECTIONS.USERS)
      .findOne({ email: email.toLowerCase(), isActive: true });
  },

  async findManyByIds(ids: ObjectId[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const db = await getDb();
    return db
      .collection<User>(COLLECTIONS.USERS)
      .find({ _id: { $in: ids }, isActive: true })
      .toArray();
  },

  /**
   * Find many by id regardless of active state. Use for displaying names on
   * historical records — a deactivated employee still owns past assessments
   * and must not render as "Unknown".
   */
  async findManyByIdsAny(ids: ObjectId[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const db = await getDb();
    return db
      .collection<User>(COLLECTIONS.USERS)
      .find({ _id: { $in: ids } })
      .toArray();
  },

  /** Employees matching a campaign's targeting filters. */
  async findParticipants(filter: {
    jobFamilyId?: ObjectId;
    divisions?: string[];
  }): Promise<User[]> {
    const db = await getDb();
    const query: Record<string, unknown> = { isActive: true };
    if (filter.jobFamilyId) query.jobFamily = filter.jobFamilyId;
    if (filter.divisions && filter.divisions.length > 0) {
      query.division = { $in: filter.divisions };
    }
    return db.collection<User>(COLLECTIONS.USERS).find(query).toArray();
  },

  /** Distinct, sorted division names across active users (for filters). */
  async distinctDivisions(): Promise<string[]> {
    const db = await getDb();
    const values = await db
      .collection<User>(COLLECTIONS.USERS)
      .distinct("division", { isActive: true });
    return (values as string[]).filter(Boolean).sort();
  },

  /** Paginated directory listing with text search + filters. */
  async findMany(
    filters: UserFilters,
    options: { page: number; limit: number },
  ): Promise<User[]> {
    const db = await getDb();
    const skip = (options.page - 1) * options.limit;
    return db
      .collection<User>(COLLECTIONS.USERS)
      .find(buildUserQuery(filters))
      .sort({ fullName: 1 })
      .skip(skip)
      .limit(options.limit)
      .toArray();
  },

  async count(filters: UserFilters): Promise<number> {
    const db = await getDb();
    return db
      .collection<User>(COLLECTIONS.USERS)
      .countDocuments(buildUserQuery(filters));
  },

  async insert(data: NewUser): Promise<User> {
    const db = await getDb();
    const result = await db
      .collection<User>(COLLECTIONS.USERS)
      .insertOne({ ...data, email: data.email.toLowerCase() } as User);
    return { ...(data as User), _id: result.insertedId };
  },

  async update(id: ObjectId, patch: UserPatch): Promise<User | null> {
    const db = await getDb();
    const set = patch.email
      ? { ...patch, email: patch.email.toLowerCase() }
      : patch;
    const result = await db
      .collection<User>(COLLECTIONS.USERS)
      .findOneAndUpdate({ _id: id }, { $set: set }, { returnDocument: "after" });
    return result ?? null;
  },

  async setLastLogin(id: ObjectId): Promise<void> {
    const db = await getDb();
    await db
      .collection<User>(COLLECTIONS.USERS)
      .updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } });
  },
};

function buildUserQuery(filters: UserFilters): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (filters.division) query.division = filters.division;
  if (filters.jobFamilyId) query.jobFamily = filters.jobFamilyId;
  if (filters.role) query.systemRoles = filters.role;
  if (filters.search) {
    const rx = new RegExp(escapeRegex(filters.search), "i");
    query.$or = [{ fullName: rx }, { email: rx }, { employeeCode: rx }];
  }
  return query;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
