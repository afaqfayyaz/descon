import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { User } from "@/lib/domain/types/user.types";
import {
  APPLICATION_ROLES,
  SUPER_ADMIN_ROLE,
  type SystemRole,
} from "@/lib/domain/constants";

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
  /**
   * Which kind of account to list. "staff" are the people who get assessed
   * (People Directory); "application" are the accounts that administer the
   * platform (Settings). Omit to list both.
   */
  kind?: "staff" | "application";
  /**
   * Deactivated people are kept (past assessments still reference them) but are
   * hidden by default, so deactivating visibly removes someone from the
   * directory. Set true to list them for restoring.
   */
  includeInactive?: boolean;
  /** List *only* deactivated people (the Deactivated tab). */
  onlyInactive?: boolean;
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

  /**
   * Employees matching a campaign's targeting filters. Application users
   * (admins, executives, the super admin) are never assessed, so they can
   * never be pulled into a campaign even if they match on division/family.
   */
  async findParticipants(filter: {
    jobFamilyId?: ObjectId;
    divisions?: string[];
  }): Promise<User[]> {
    const db = await getDb();
    const query: Record<string, unknown> = {
      isActive: true,
      systemRoles: { $nin: APPLICATION_ROLES },
    };
    if (filter.jobFamilyId) query.jobFamily = filter.jobFamilyId;
    if (filter.divisions && filter.divisions.length > 0) {
      query.division = { $in: filter.divisions };
    }
    return db.collection<User>(COLLECTIONS.USERS).find(query).toArray();
  },

  /** How many active people report to this person. */
  async countReports(managerId: ObjectId): Promise<number> {
    const db = await getDb();
    return db
      .collection<User>(COLLECTIONS.USERS)
      .countDocuments({ lineManagerId: managerId, isActive: true });
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
  if (filters.onlyInactive) query.isActive = false;
  else if (!filters.includeInactive) query.isActive = true;
  if (filters.search) {
    const rx = new RegExp(escapeRegex(filters.search), "i");
    query.$or = [{ fullName: rx }, { email: rx }, { employeeCode: rx }];
  }

  // Role constraints are combined with $and so the kind filter and an explicit
  // role tab can't clobber each other on the same systemRoles field.
  const roleClauses: Record<string, unknown>[] = [];

  // The break-glass account is hidden from every listing, always.
  roleClauses.push({ systemRoles: { $ne: SUPER_ADMIN_ROLE } });

  if (filters.kind === "staff") {
    roleClauses.push({ systemRoles: { $nin: APPLICATION_ROLES } });
  } else if (filters.kind === "application") {
    roleClauses.push({ systemRoles: { $in: APPLICATION_ROLES } });
  }
  if (filters.role) roleClauses.push({ systemRoles: filters.role });

  query.$and = roleClauses;
  return query;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
