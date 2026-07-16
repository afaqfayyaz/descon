import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { AccessToken, AccessTokenKind } from "@/lib/domain/types/token.types";

type NewAccessToken = Omit<AccessToken, "_id">;

export const accessTokenRepo = {
  async findByHash(tokenHash: string): Promise<AccessToken | null> {
    const db = await getDb();
    return db
      .collection<AccessToken>(COLLECTIONS.ACCESS_TOKENS)
      .findOne({ tokenHash });
  },

  async insert(data: NewAccessToken): Promise<AccessToken> {
    const db = await getDb();
    const result = await db
      .collection<AccessToken>(COLLECTIONS.ACCESS_TOKENS)
      .insertOne(data as AccessToken);
    return { ...(data as AccessToken), _id: result.insertedId };
  },

  /** Remove any existing tokens for this assessment+kind (resend rotation). */
  async deleteForAssessmentKind(
    assessmentId: ObjectId,
    kind: AccessTokenKind,
  ): Promise<void> {
    const db = await getDb();
    await db
      .collection<AccessToken>(COLLECTIONS.ACCESS_TOKENS)
      .deleteMany({ assessmentId, kind });
  },

  async touch(id: ObjectId): Promise<void> {
    const db = await getDb();
    await db
      .collection<AccessToken>(COLLECTIONS.ACCESS_TOKENS)
      .updateOne({ _id: id }, { $set: { lastUsedAt: new Date() } });
  },

  async markConsumed(id: ObjectId): Promise<void> {
    const db = await getDb();
    await db
      .collection<AccessToken>(COLLECTIONS.ACCESS_TOKENS)
      .updateOne({ _id: id }, { $set: { consumedAt: new Date() } });
  },

  async deleteAll(): Promise<void> {
    const db = await getDb();
    await db.collection(COLLECTIONS.ACCESS_TOKENS).deleteMany({});
  },
};
