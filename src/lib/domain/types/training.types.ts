import type { ObjectId } from "mongodb";
import type { AuditFields } from "./common.types";

export type TrainingType =
  | "course"
  | "certification"
  | "workshop"
  | "mentoring"
  | "stretch_assignment"
  | "other";

export type AssignmentStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface TrainingAssignment {
  employeeId: ObjectId;
  assignedAt: Date;
  assignedBy: ObjectId;
  dueDate: Date | null;
  status: AssignmentStatus;
  completedAt: Date | null;
  notes: string | null;
}

export interface Training extends AuditFields {
  _id: ObjectId;
  name: string;
  description: string | null;
  type: TrainingType;
  durationHours: number | null;
  provider: string | null;
  url: string | null;
  addressesSubCompetencies: ObjectId[];
  isActive: boolean;
  assignments: TrainingAssignment[];
}
