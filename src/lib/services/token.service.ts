import crypto from "node:crypto";
import { ObjectId } from "mongodb";

import { accessTokenRepo } from "@/lib/db/repositories/access-token.repository";
import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import type { AccessTokenKind } from "@/lib/domain/types/token.types";
import type { Assessment } from "@/lib/domain/types/assessment.types";

const DAY_MS = 24 * 60 * 60 * 1000;

function hash(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export type TokenResolution =
  | {
      status: "ok";
      kind: AccessTokenKind;
      tokenId: ObjectId;
      assessment: Assessment;
    }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "consumed" };

export const tokenService = {
  /**
   * Issue a fresh raw token for one assessment side. Any prior token for the
   * same side is removed first, so a resend invalidates the old link.
   * Returns the raw token (only ever exposed in the emailed URL).
   */
  async issueToken(
    assessmentId: ObjectId,
    kind: AccessTokenKind,
    opts: { ttlDays?: number; createdBy?: ObjectId | null } = {},
  ): Promise<string> {
    const raw = crypto.randomBytes(32).toString("hex");
    const now = new Date();
    await accessTokenRepo.deleteForAssessmentKind(assessmentId, kind);
    await accessTokenRepo.insert({
      assessmentId,
      kind,
      tokenHash: hash(raw),
      expiresAt: new Date(now.getTime() + (opts.ttlDays ?? 30) * DAY_MS),
      createdAt: now,
      lastUsedAt: null,
      consumedAt: null,
      createdBy: opts.createdBy ?? null,
    });
    return raw;
  },

  /** Resolve a raw token to its assessment, returning a friendly status. */
  async resolveToken(raw: string): Promise<TokenResolution> {
    if (!raw || typeof raw !== "string") return { status: "invalid" };
    const doc = await accessTokenRepo.findByHash(hash(raw));
    if (!doc) return { status: "invalid" };
    if (doc.consumedAt) return { status: "consumed" };
    if (doc.expiresAt.getTime() < Date.now()) return { status: "expired" };
    const assessment = await assessmentRepo.findById(doc.assessmentId);
    if (!assessment) return { status: "invalid" };
    await accessTokenRepo.touch(doc._id);
    return {
      status: "ok",
      kind: doc.kind,
      tokenId: doc._id,
      assessment,
    };
  },

  /** Mark a token consumed (called after the relevant side is submitted). */
  async consume(raw: string): Promise<void> {
    const doc = await accessTokenRepo.findByHash(hash(raw));
    if (doc) await accessTokenRepo.markConsumed(doc._id);
  },
};
