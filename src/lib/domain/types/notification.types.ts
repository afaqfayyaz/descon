import type { ObjectId } from "mongodb";

export type NotificationType =
  | "assignment"
  | "self_reminder"
  | "manager_reminder"
  | "finalized";

export interface Notification {
  _id: ObjectId;
  recipientId: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  campaignId: ObjectId | null;
  assessmentId: ObjectId | null;
  /** Stable key guaranteeing a given notification is created at most once. */
  dedupeKey: string;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}
