import type { ObjectId } from "mongodb";

/** Fields present on every persisted document. */
export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId | null;
  updatedBy: ObjectId | null;
}

/** The authenticated user performing a state-changing action. */
export interface Actor {
  id: ObjectId;
  email: string | null;
}
