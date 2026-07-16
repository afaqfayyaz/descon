import type { ObjectId } from "mongodb";

export type AccessTokenKind = "self" | "manager";

/**
 * A single-use-ish bearer link for passwordless access to ONE assessment side.
 * Only the SHA-256 hash of the raw token is stored; the raw token lives only in
 * the emailed URL. Resending rotates the token (the prior one is removed).
 */
export interface AccessToken {
  _id: ObjectId;
  assessmentId: ObjectId;
  kind: AccessTokenKind;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date | null;
  consumedAt: Date | null;
  createdBy: ObjectId | null;
}
