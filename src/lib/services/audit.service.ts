import type { ObjectId } from "mongodb";
import { headers } from "next/headers";

import { auditLogRepo } from "@/lib/db/repositories/audit-log.repository";
import type {
  AuditLogFilters,
} from "@/lib/db/repositories/audit-log.repository";
import type { AuditLog } from "@/lib/domain/types/audit.types";
import { logger } from "@/lib/utils/logger";

export interface AuditEntry {
  actorId: ObjectId | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: ObjectId | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/** Best-effort extraction of request IP + user agent for forensic context. */
function requestContext(): { ip: string | null; userAgent: string | null } {
  try {
    const h = headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    return { ip, userAgent: h.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export const auditService = {
  /**
   * Record a state-changing action to the immutable audit trail
   * (CODING_STANDARDS §Security #5). Never throws — a failed audit write must
   * not break the user's operation; it is logged instead.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      const { ip, userAgent } = requestContext();
      await auditLogRepo.insert({
        timestamp: new Date(),
        actorId: entry.actorId,
        actorEmail: entry.actorEmail ?? null,
        actorIp: ip,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        changes:
          entry.before !== undefined || entry.after !== undefined
            ? { before: entry.before ?? null, after: entry.after ?? null }
            : null,
        metadata: { userAgent, requestId: null, ...(entry.metadata ?? {}) },
      });
    } catch (error) {
      logger.error({ error, action: entry.action }, "audit log write failed");
    }
  },

  async list(
    filters: AuditLogFilters,
    options: { page: number; limit: number },
  ): Promise<{ items: AuditLog[]; total: number }> {
    const [items, total] = await Promise.all([
      auditLogRepo.findMany(filters, options),
      auditLogRepo.count(filters),
    ]);
    return { items, total };
  },

  async actions(): Promise<string[]> {
    return auditLogRepo.distinctActions();
  },
};
