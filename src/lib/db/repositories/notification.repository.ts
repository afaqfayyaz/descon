import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import type { Notification } from "@/lib/domain/types/notification.types";

export type NewNotification = Omit<Notification, "_id" | "read" | "readAt" | "createdAt">;

export const notificationRepo = {
  /**
   * Insert a notification only if its dedupeKey has not been seen before.
   * Returns true when a new document was created.
   */
  async insertIfAbsent(data: NewNotification): Promise<boolean> {
    const db = await getDb();
    const res = await db
      .collection<Notification>(COLLECTIONS.NOTIFICATIONS)
      .updateOne(
        { dedupeKey: data.dedupeKey },
        {
          $setOnInsert: {
            recipientId: data.recipientId,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link,
            campaignId: data.campaignId,
            assessmentId: data.assessmentId,
            dedupeKey: data.dedupeKey,
            read: false,
            readAt: null,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    return res.upsertedCount > 0;
  },

  async listForUser(recipientId: ObjectId, limit = 20): Promise<Notification[]> {
    const db = await getDb();
    return db
      .collection<Notification>(COLLECTIONS.NOTIFICATIONS)
      .find({ recipientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async unreadCount(recipientId: ObjectId): Promise<number> {
    const db = await getDb();
    return db
      .collection<Notification>(COLLECTIONS.NOTIFICATIONS)
      .countDocuments({ recipientId, read: false });
  },

  async markRead(id: ObjectId, recipientId: ObjectId): Promise<void> {
    const db = await getDb();
    await db
      .collection<Notification>(COLLECTIONS.NOTIFICATIONS)
      .updateOne(
        { _id: id, recipientId },
        { $set: { read: true, readAt: new Date() } },
      );
  },

  async markAllRead(recipientId: ObjectId): Promise<void> {
    const db = await getDb();
    await db
      .collection<Notification>(COLLECTIONS.NOTIFICATIONS)
      .updateMany(
        { recipientId, read: false },
        { $set: { read: true, readAt: new Date() } },
      );
  },
};
