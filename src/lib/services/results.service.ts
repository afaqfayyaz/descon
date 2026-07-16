import type { ObjectId } from "mongodb";

import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { assessmentResultRepo } from "@/lib/db/repositories/assessment-result.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { rollupArea, rollupOverall } from "@/lib/domain/scoring/rollup";
import { settingsService } from "@/lib/services/settings.service";
import type { Assessment } from "@/lib/domain/types/assessment.types";
import type { TrafficLight, CalibrationFlag } from "@/lib/domain/constants";
import { STATUS } from "@/lib/domain/constants";
import { NotFoundError } from "@/lib/utils/errors";

/** Where an employee's latest assessment sits in the flow (for the directory). */
export type EmployeeAssessmentStatus =
  | "not_assigned"
  | "sent"
  | "self_done"
  | "scored"
  | "finalized";

export interface EmployeeSummary {
  status: EmployeeAssessmentStatus;
  assessmentId: string | null;
  capabilityPercent: number | null;
  gap: number | null;
  trafficLight: TrafficLight | null;
}

function deriveStatus(a: Assessment): EmployeeAssessmentStatus {
  if (a.selfAssessment.status !== STATUS.SUBMITTED) return "sent";
  if (a.managerAssessment.status !== STATUS.SUBMITTED) return "self_done";
  if (a.finalStatus === "finalized") return "finalized";
  return "scored";
}

export interface ResultDetailRow {
  subCode: string;
  subName: string;
  areaName: string;
  selfLevel: number | null;
  managerLevel: number | null;
  requiredLevel: number | null;
  gap: number | null;
  trafficLight: TrafficLight | null;
  difference: number | null;
  calibrationFlag: CalibrationFlag | null;
}

export interface AreaSummary {
  areaName: string;
  managerLevel: number;
  requiredLevel: number;
  gap: number;
  trafficLight: TrafficLight;
}

export interface EmployeeHistoryEntry {
  assessmentId: string;
  campaignName: string;
  date: string;
  status: EmployeeAssessmentStatus;
  capabilityPercent: number | null;
  selfLevel: number | null;
  managerLevel: number | null;
  requiredLevel: number | null;
  gap: number | null;
  trafficLight: TrafficLight | null;
}

export interface AssessmentResultView {
  employee: { name: string; division: string };
  finalStatus: string;
  overall: {
    managerLevel: number;
    requiredLevel: number;
    gap: number;
    capabilityPercent: number;
    trafficLight: TrafficLight;
  } | null;
  areas: AreaSummary[];
  rows: ResultDetailRow[];
}

export const resultsService = {
  /**
   * Build the full result view for one assessment: overall capability rollup,
   * per-area summaries, and the per-sub-competency detail rows (self vs manager
   * vs required, gap, traffic light, calibration). Read-only; safe to call once
   * both sides are scored. Throws NotFoundError if the assessment is missing.
   */
  async getAssessmentResultView(
    assessmentId: ObjectId,
  ): Promise<AssessmentResultView> {
    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");

    const [employee, results, areas, thresholds] = await Promise.all([
      userRepo.findById(assessment.employeeId),
      assessmentResultRepo.findByAssessment(assessmentId),
      competencyAreaRepo.findByJobFamily(assessment.jobFamilyAtCampaign),
      settingsService.getThresholds(),
    ]);
    const gapThresholds = thresholds.gap;

    const subs = await subCompetencyRepo.findByAreas(areas.map((a) => a._id));
    const subMap = new Map(subs.map((s) => [s._id.toString(), s]));
    const areaMap = new Map(areas.map((a) => [a._id.toString(), a]));

    const rows: ResultDetailRow[] = results
      .map((r) => {
        const sub = subMap.get(r.subCompetencyId.toString());
        const area = sub ? areaMap.get(sub.areaId.toString()) : undefined;
        return {
          subCode: sub?.code ?? "?",
          subName: sub?.name ?? "Unknown",
          areaName: area?.name ?? "Unknown",
          selfLevel: r.selfLevel,
          managerLevel: r.managerLevel,
          requiredLevel: r.requiredLevel || null,
          gap: r.gap,
          trafficLight: r.trafficLight,
          difference: r.difference,
          calibrationFlag: r.calibrationFlag,
        };
      })
      .sort((a, b) => a.subCode.localeCompare(b.subCode, undefined, { numeric: true }));

    // Area rollups
    const byArea = new Map<string, { mgr: number; req: number }[]>();
    for (const r of results) {
      const sub = subMap.get(r.subCompetencyId.toString());
      if (!sub || r.managerLevel === null || !r.requiredLevel) continue;
      const key = sub.areaId.toString();
      if (!byArea.has(key)) byArea.set(key, []);
      byArea
        .get(key)!
        .push({ mgr: r.managerLevel, req: r.requiredLevel });
    }

    const areaSummaries: AreaSummary[] = [];
    const weightedAreas: {
      managerLevel: number;
      requiredLevel: number;
      weight: number;
    }[] = [];

    for (const area of areas) {
      const items = byArea.get(area._id.toString());
      if (!items || items.length === 0) continue;
      const rollup = rollupArea(
        items.map((i) => ({ managerLevel: i.mgr, requiredLevel: i.req })),
        gapThresholds,
      );
      if (!rollup) continue;
      areaSummaries.push({
        areaName: area.name,
        managerLevel: rollup.managerLevel,
        requiredLevel: rollup.requiredLevel,
        gap: rollup.gap,
        trafficLight: rollup.trafficLight,
      });
      weightedAreas.push({
        managerLevel: rollup.managerLevel,
        requiredLevel: rollup.requiredLevel,
        weight: area.weight,
      });
    }

    const overall = rollupOverall(weightedAreas, gapThresholds);

    return {
      employee: {
        name: employee?.fullName ?? "Unknown",
        division: employee?.division ?? "",
      },
      finalStatus: assessment.finalStatus,
      overall,
      areas: areaSummaries,
      rows,
    };
  },

  /**
   * Latest-assessment summary per employee for the directory: status +
   * overall capability/gap when both sides are in and results are computed.
   */
  async getEmployeeSummaries(
    employeeIds: ObjectId[],
  ): Promise<Record<string, EmployeeSummary>> {
    const out: Record<string, EmployeeSummary> = {};
    for (const id of employeeIds) {
      const a = await assessmentRepo.findLatestForEmployee(id);
      if (!a) {
        out[id.toString()] = {
          status: "not_assigned",
          assessmentId: null,
          capabilityPercent: null,
          gap: null,
          trafficLight: null,
        };
        continue;
      }
      const status = deriveStatus(a);
      let capabilityPercent: number | null = null;
      let gap: number | null = null;
      let trafficLight: TrafficLight | null = null;
      if (
        a.selfAssessment.status === STATUS.SUBMITTED &&
        a.managerAssessment.status === STATUS.SUBMITTED
      ) {
        const view = await this.getAssessmentResultView(a._id);
        if (view.overall) {
          capabilityPercent = view.overall.capabilityPercent;
          gap = view.overall.gap;
          trafficLight = view.overall.trafficLight;
        }
      }
      out[id.toString()] = {
        status,
        assessmentId: a._id.toString(),
        capabilityPercent,
        gap,
        trafficLight,
      };
    }
    return out;
  },

  /** The employee's latest assessment result view (or status when pending). */
  async getEmployeeLatestResultView(employeeId: ObjectId): Promise<{
    hasAssessment: boolean;
    assessmentId: string | null;
    status: EmployeeAssessmentStatus;
    view: AssessmentResultView | null;
  }> {
    const a = await assessmentRepo.findLatestForEmployee(employeeId);
    if (!a) {
      return {
        hasAssessment: false,
        assessmentId: null,
        status: "not_assigned",
        view: null,
      };
    }
    const status = deriveStatus(a);
    const view =
      a.selfAssessment.status === STATUS.SUBMITTED &&
      a.managerAssessment.status === STATUS.SUBMITTED
        ? await this.getAssessmentResultView(a._id)
        : null;
    return {
      hasAssessment: true,
      assessmentId: a._id.toString(),
      status,
      view,
    };
  },

  /**
   * The employee's full assessment history over time (oldest → newest): every
   * assessment they took, with the campaign, date, overall self/manager/required
   * levels, capability %, gap and status. Powers the timeline + trend chart.
   */
  async getEmployeeHistory(employeeId: ObjectId): Promise<EmployeeHistoryEntry[]> {
    const assessments = await assessmentRepo.findForEmployee(employeeId);
    if (assessments.length === 0) return [];

    // Resolve campaign names (unique).
    const campaignIds = new Map(
      assessments.map((a) => [a.campaignId.toString(), a.campaignId]),
    );
    const campaigns = await Promise.all(
      [...campaignIds.values()].map((id) => campaignRepo.findById(id)),
    );
    const campaignName = new Map(
      campaigns
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => [c._id.toString(), c.name]),
    );

    const entries: EmployeeHistoryEntry[] = [];
    for (const a of assessments) {
      const status = deriveStatus(a);
      const bothIn =
        a.selfAssessment.status === STATUS.SUBMITTED &&
        a.managerAssessment.status === STATUS.SUBMITTED;
      let capabilityPercent: number | null = null;
      let managerLevel: number | null = null;
      let selfLevel: number | null = null;
      let requiredLevel: number | null = null;
      let gap: number | null = null;
      let trafficLight: TrafficLight | null = null;

      if (bothIn) {
        const view = await this.getAssessmentResultView(a._id);
        if (view.overall) {
          capabilityPercent = view.overall.capabilityPercent;
          managerLevel = view.overall.managerLevel;
          requiredLevel = view.overall.requiredLevel;
          gap = view.overall.gap;
          trafficLight = view.overall.trafficLight;
        }
        const selfs = view.rows
          .map((r) => r.selfLevel)
          .filter((v): v is number => v !== null);
        if (selfs.length > 0) {
          selfLevel =
            Math.round((selfs.reduce((s, v) => s + v, 0) / selfs.length) * 100) /
            100;
        }
      }

      const date =
        a.finalizedAt ??
        a.managerAssessment.submittedAt ??
        a.selfAssessment.submittedAt ??
        a.createdAt;

      entries.push({
        assessmentId: a._id.toString(),
        campaignName: campaignName.get(a.campaignId.toString()) ?? "Assessment",
        date: new Date(date).toISOString(),
        status,
        capabilityPercent,
        selfLevel,
        managerLevel,
        requiredLevel,
        gap,
        trafficLight,
      });
    }

    return entries.sort((a, b) => +new Date(a.date) - +new Date(b.date));
  },

  /** Campaign overview: stats + per-employee status list. */
  async getCampaignOverview(campaignId: ObjectId) {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign");

    const assessments = await assessmentRepo.findByCampaign(campaignId);
    const employees = await userRepo.findManyByIds(
      assessments.map((a) => a.employeeId),
    );
    const empMap = new Map(employees.map((e) => [e._id.toString(), e]));

    const participants = assessments.map((a) => {
      const emp = empMap.get(a.employeeId.toString());
      return {
        assessmentId: a._id.toString(),
        name: emp?.fullName ?? "Unknown",
        division: emp?.division ?? "",
        selfStatus: a.selfAssessment.status,
        managerStatus: a.managerAssessment.status,
        finalStatus: a.finalStatus,
      };
    });

    return { campaign, participants };
  },
};
