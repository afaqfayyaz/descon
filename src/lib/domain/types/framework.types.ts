import type { ObjectId } from "mongodb";
import type { AuditFields } from "./common.types";

export interface JobFamily extends AuditFields {
  _id: ObjectId;
  name: string;
  code: string;
  description: string | null;
  version: number;
  status: "active" | "draft" | "archived";
}

export interface CompetencyArea extends AuditFields {
  _id: ObjectId;
  jobFamilyId: ObjectId;
  name: string;
  code: string;
  description: string | null;
  sequence: number;
  weight: number;
  isActive: boolean;
}

export interface SubCompetency extends AuditFields {
  _id: ObjectId;
  areaId: ObjectId;
  name: string;
  code: string;
  description: string | null;
  behavioralIndicators: string[];
  sequence: number;
  isActive: boolean;
}

export interface QuestionOption {
  letter: string;
  text: string;
  score: number;
}

export interface Question extends AuditFields {
  _id: ObjectId;
  subCompetencyId: ObjectId;
  text: string;
  options: QuestionOption[];
  /**
   * Relative importance of this question within its sub-competency. Used as the
   * weight when averaging the per-question self-assessment scores. Defaults to 1.
   */
  weight: number;
  sequence: number;
  isActive: boolean;
  version: number;
}

export interface Role extends AuditFields {
  _id: ObjectId;
  name: string;
  code: string;
  level: number;
  description: string | null;
  isActive: boolean;
}

export interface RequiredLevel extends AuditFields {
  _id: ObjectId;
  subCompetencyId: ObjectId;
  roleId: ObjectId;
  requiredLevel: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}
