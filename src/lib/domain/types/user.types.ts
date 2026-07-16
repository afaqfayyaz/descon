import type { ObjectId } from "mongodb";
import type { AuditFields } from "./common.types";
import type { SystemRole } from "@/lib/domain/constants";

export interface User extends AuditFields {
  _id: ObjectId;
  email: string;
  fullName: string;
  employeeCode: string;

  passwordHash: string | null;
  authProvider: "local" | "azure_ad" | "saml";

  designation: ObjectId; // → roles._id
  division: string;
  department: string | null;
  jobFamily: ObjectId; // → jobFamilies._id
  lineManagerId: ObjectId | null;

  systemRoles: SystemRole[];

  avatarUrl: string | null;
  phoneNumber: string | null;
  joinedAt: Date;

  isActive: boolean;
  lastLoginAt: Date | null;
}
