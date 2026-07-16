import type { ObjectId } from "mongodb";

/**
 * Immutable audit record (SCHEMA.md §12). Insert-only — never updated or deleted.
 */
export interface AuditLog {
  _id: ObjectId;
  timestamp: Date;
  actorId: ObjectId | null;
  actorEmail: string | null;
  actorIp: string | null;

  action: string;
  entityType: string;
  entityId: ObjectId | null;

  changes: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  } | null;

  metadata: {
    userAgent: string | null;
    requestId: string | null;
    [key: string]: unknown;
  };
}
