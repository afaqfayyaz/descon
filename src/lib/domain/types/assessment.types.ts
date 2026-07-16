import type { ObjectId } from "mongodb";
import type {
  CampaignStatus,
  FinalStatus,
  SideStatus,
  TrafficLight,
  CalibrationFlag,
} from "@/lib/domain/constants";

/**
 * Which questions a test covers. `mode: "full"` means the entire active
 * framework for the job family; `mode: "custom"` restricts the test to the
 * listed `questionIds` (e.g. a subset of areas/sub-competencies, or a random
 * sample of N questions chosen when the campaign was built).
 */
export interface CampaignScope {
  mode: "full" | "custom";
  questionIds: ObjectId[];
}

/**
 * The scope snapshotted onto an individual Assessment at launch so historical
 * tests stay reproducible even if the framework later changes. For `full`
 * both arrays are empty (meaning "everything active at scoring time").
 */
export interface AssessmentScope {
  mode: "full" | "custom";
  questionIds: ObjectId[];
  subCompetencyIds: ObjectId[];
}

export interface AssessmentCampaign {
  _id: ObjectId;
  name: string;
  description: string | null;
  jobFamilyIds: ObjectId[];
  divisionFilter: string[];
  participantIds: ObjectId[];
  scope: CampaignScope;

  startDate: Date;
  selfAssessmentDeadline: Date;
  managerAssessmentDeadline: Date;
  calibrationDeadline: Date;

  status: CampaignStatus;

  reminderConfig: {
    enabled: boolean;
    daysBefore: number[];
  };

  stats: {
    totalParticipants: number;
    selfCompleted: number;
    managerCompleted: number;
    calibrationOutliers: number;
    finalized: number;
  };

  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}

export interface SelfAnswer {
  questionId: ObjectId;
  questionVersion: number;
  selectedOption: string;
  answeredAt: Date;
}

export interface ManagerRating {
  subCompetencyId: ObjectId;
  rating: number;
  evidence: string | null;
  ratedAt: Date;
}

/**
 * A calibration override applied during the workshop. Preserves the original
 * manager rating for audit; scoring uses `adjustedLevel` when present.
 */
export interface CalibrationAdjustment {
  subCompetencyId: ObjectId;
  originalLevel: number | null;
  adjustedLevel: number;
  note: string | null;
  adjustedBy: ObjectId;
  adjustedAt: Date;
}

export interface Assessment {
  _id: ObjectId;
  campaignId: ObjectId;
  employeeId: ObjectId;
  lineManagerId: ObjectId | null;
  designationAtCampaign: ObjectId;
  jobFamilyAtCampaign: ObjectId;
  scope: AssessmentScope;

  selfAssessment: {
    status: SideStatus;
    startedAt: Date | null;
    submittedAt: Date | null;
    progress: number;
    answers: SelfAnswer[];
  };

  managerAssessment: {
    status: SideStatus;
    startedAt: Date | null;
    submittedAt: Date | null;
    progress: number;
    ratings: ManagerRating[];
  };

  calibrationAdjustments: CalibrationAdjustment[];

  finalStatus: FinalStatus;
  finalizedAt: Date | null;
  finalizedBy: ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentResult {
  _id: ObjectId;
  assessmentId: ObjectId;
  campaignId: ObjectId;
  employeeId: ObjectId;
  subCompetencyId: ObjectId;

  selfLevel: number | null;
  managerLevel: number | null;
  difference: number | null;

  requiredLevel: number;
  gap: number | null;
  trafficLight: TrafficLight | null;

  calibrationFlag: CalibrationFlag | null;
  calibrationNote: string | null;

  computedAt: Date;
  status: "pending" | "computed" | "locked";

  denormalized: {
    division: string;
    department: string | null;
    designation: ObjectId;
    jobFamily: ObjectId;
    areaId: ObjectId;
  };

  createdAt: Date;
  updatedAt: Date;
}
