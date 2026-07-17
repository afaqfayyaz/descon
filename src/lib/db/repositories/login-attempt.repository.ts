import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";

/**
 * One document per failed sign-in, keyed by (lowercased) email. Documents
 * expire via a TTL index (see indexes.ts), so the collection is self-pruning —
 * counting recent docs gives a durable sliding window that works across
 * serverless instances, where in-memory counters would reset per instance.
 */
export interface LoginAttempt {
  email: string;
  createdAt: Date;
}

export const loginAttemptRepo = {
  async record(email: string): Promise<void> {
    const db = await getDb();
    await db.collection<LoginAttempt>(COLLECTIONS.LOGIN_ATTEMPTS).insertOne({
      email: email.toLowerCase(),
      createdAt: new Date(),
    });
  },

  /** Failed attempts for this email within the last `windowMs`. */
  async countRecent(email: string, windowMs: number): Promise<number> {
    const db = await getDb();
    return db.collection<LoginAttempt>(COLLECTIONS.LOGIN_ATTEMPTS).countDocuments({
      email: email.toLowerCase(),
      createdAt: { $gte: new Date(Date.now() - windowMs) },
    });
  },

  /** A successful sign-in wipes the slate. */
  async clear(email: string): Promise<void> {
    const db = await getDb();
    await db
      .collection<LoginAttempt>(COLLECTIONS.LOGIN_ATTEMPTS)
      .deleteMany({ email: email.toLowerCase() });
  },
};
