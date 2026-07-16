import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { AuditLog } from "@/lib/domain/types/audit.types";

type NewAuditLog = Omit<AuditLog, "_id">;

export interface AuditLogFilters {
  actorId?: ObjectId;
  action?: string;
  entityType?: string;
  entityId?: ObjectId;
  from?: Date;
  to?: Date;
}

export const auditLogRepo = {
  /** Insert-only. The audit collection is never updated or deleted. */
  async insert(data: NewAuditLog): Promise<void> {
    const db = await getDb();
    await db.collection<AuditLog>(COLLECTIONS.AUDIT_LOGS).insertOne(data as AuditLog);
  },

  async findMany(
    filters: AuditLogFilters,
    options: { page: number; limit: number },
  ): Promise<AuditLog[]> {
    const db = await getDb();
    const query = buildQuery(filters);
    const skip = (options.page - 1) * options.limit;
    return db
      .collection<AuditLog>(COLLECTIONS.AUDIT_LOGS)
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(options.limit)
      .toArray();
  },

  async count(filters: AuditLogFilters): Promise<number> {
    const db = await getDb();
    return db
      .collection<AuditLog>(COLLECTIONS.AUDIT_LOGS)
      .countDocuments(buildQuery(filters));
  },

  /** Distinct action names present in the log (for filter dropdowns). */
  async distinctActions(): Promise<string[]> {
    const db = await getDb();
    const values = await db
      .collection<AuditLog>(COLLECTIONS.AUDIT_LOGS)
      .distinct("action");
    return (values as string[]).sort();
  },
};

function buildQuery(filters: AuditLogFilters): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (filters.actorId) query.actorId = filters.actorId;
  if (filters.action) query.action = filters.action;
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.entityId) query.entityId = filters.entityId;
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = filters.from;
    if (filters.to) range.$lte = filters.to;
    query.timestamp = range;
  }
  return query;
}
