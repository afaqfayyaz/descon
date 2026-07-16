import type { ObjectId } from "mongodb";

import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { questionRepo } from "@/lib/db/repositories/question.repository";
import { requiredLevelRepo } from "@/lib/db/repositories/required-level.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { assessmentResultRepo } from "@/lib/db/repositories/assessment-result.repository";
import { settingsService } from "@/lib/services/settings.service";
import { DIRECT_ASSIGNMENT_DESCRIPTION } from "@/lib/services/campaign.service";
import { getTrafficLight } from "@/lib/domain/scoring/gap";
import { round2 } from "@/lib/domain/scoring/self-level";
import {
  isQuestionInScope,
  isSubInScope,
  normalizeScope,
} from "@/lib/domain/scope";
import { STATUS } from "@/lib/domain/constants";
import type { SideStatus, TrafficLight } from "@/lib/domain/constants";
import type { AssessmentCampaign } from "@/lib/domain/types/assessment.types";
import { ForbiddenError, NotFoundError } from "@/lib/utils/errors";

/** Whole days from today (UTC date-only) until a deadline. */
function daysLeftUntil(deadline: Date | null | undefined): number | null {
  if (!deadline) return null;
  const now = new Date();
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(deadline);
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86_400_000);
}

// ---- Employee self-questionnaire ----

export interface QnOption {
  letter: string;
  text: string;
}
export interface QnQuestion {
  id: string;
  version: number;
  text: string;
  options: QnOption[]; // scores intentionally omitted — employees never see them
  selected: string | null;
}
export interface QnSub {
  code: string;
  name: string;
  questions: QnQuestion[];
}
export interface QnArea {
  code: string;
  name: string;
  subs: QnSub[];
}
export interface SelfQuestionnaire {
  assessmentId: string;
  status: SideStatus;
  progress: number;
  totalQuestions: number;
  answered: number;
  areas: QnArea[];
}

// ---- Manager rating sheet ----

export interface RateSub {
  id: string;
  code: string;
  name: string;
  description: string | null;
  requiredLevel: number | null;
  indicators: string[];
  rating: number | null;
  evidence: string | null;
}
export interface RateArea {
  code: string;
  name: string;
  subs: RateSub[];
}
export interface ManagerSheet {
  assessmentId: string;
  employeeName: string;
  employeeRole: string;
  employeeDivision: string;
  status: SideStatus;
  progress: number;
  totalSubs: number;
  rated: number;
  areas: RateArea[];
}

// ---- Manager team dashboard (PRD §6.3 / FR-DSH-001) ----

export interface MgrTeamRow {
  assessmentId: string;
  employeeName: string;
  roleName: string;
  division: string;
  status: SideStatus;
  progress: number;
  daysLeft: number | null;
}
export interface MgrHeatmapCell {
  gap: number;
  managerLevel: number;
  trafficLight: TrafficLight;
}
export interface MgrHeatmapRow {
  employeeName: string;
  cells: (MgrHeatmapCell | null)[];
}
export interface ManagerDashboard {
  cycleName: string | null;
  kpis: {
    teamCount: number;
    ratingsComplete: number;
    ratingsTotal: number;
    daysLeft: number | null;
    criticalGaps: number | null;
  };
  rows: MgrTeamRow[];
  heatmap: {
    areas: { code: string; name: string }[];
    rows: MgrHeatmapRow[];
    resultsAvailable: boolean;
  };
}

export const questionnaireService = {
  async getSelfQuestionnaire(
    assessmentId: ObjectId,
    actorId: ObjectId,
    isHrAdmin = false,
  ): Promise<SelfQuestionnaire> {
    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");
    if (!isHrAdmin && !assessment.employeeId.equals(actorId)) {
      throw new ForbiddenError("view this assessment");
    }

    const scope = normalizeScope(assessment.scope);
    const areas = await competencyAreaRepo.findByJobFamily(
      assessment.jobFamilyAtCampaign,
    );
    const subsByArea = await Promise.all(
      areas.map((a) => subCompetencyRepo.findByArea(a._id)),
    );
    const allSubs = subsByArea.flat();
    const questions = await questionRepo.findBySubs(allSubs.map((s) => s._id));

    const qBySub = new Map<string, typeof questions>();
    for (const q of questions) {
      if (!isQuestionInScope(scope, q._id.toString())) continue;
      const k = q.subCompetencyId.toString();
      if (!qBySub.has(k)) qBySub.set(k, []);
      qBySub.get(k)!.push(q);
    }
    const selected = new Map(
      assessment.selfAssessment.answers.map((a) => [
        a.questionId.toString(),
        a.selectedOption,
      ]),
    );

    let total = 0;
    const areaNodes: QnArea[] = areas
      .map((area, i) => ({
        code: area.code,
        name: area.name,
        subs: (subsByArea[i] ?? [])
          .map((sub) => {
            const qs = qBySub.get(sub._id.toString()) ?? [];
            total += qs.length;
            return {
              code: sub.code,
              name: sub.name,
              questions: qs.map((q) => ({
                id: q._id.toString(),
                version: q.version,
                text: q.text,
                options: q.options.map((o) => ({
                  letter: o.letter,
                  text: o.text,
                })),
                selected: selected.get(q._id.toString()) ?? null,
              })),
            };
          })
          .filter((sub) => sub.questions.length > 0),
      }))
      .filter((area) => area.subs.length > 0);

    return {
      assessmentId: assessment._id.toString(),
      status: assessment.selfAssessment.status,
      progress: assessment.selfAssessment.progress,
      totalQuestions: total,
      answered: assessment.selfAssessment.answers.length,
      areas: areaNodes,
    };
  },

  async getManagerSheet(
    assessmentId: ObjectId,
    actorId: ObjectId,
    isHrAdmin = false,
  ): Promise<ManagerSheet> {
    const assessment = await assessmentRepo.findById(assessmentId);
    if (!assessment) throw new NotFoundError("Assessment");
    const isManager = assessment.lineManagerId?.equals(actorId) ?? false;
    if (!isHrAdmin && !isManager) {
      throw new ForbiddenError("rate this employee");
    }

    const scope = normalizeScope(assessment.scope);
    const [employee, areas] = await Promise.all([
      userRepo.findById(assessment.employeeId),
      competencyAreaRepo.findByJobFamily(assessment.jobFamilyAtCampaign),
    ]);
    const role = employee?.designation
      ? await roleRepo.findById(employee.designation)
      : null;
    const subsByAreaAll = await Promise.all(
      areas.map((a) => subCompetencyRepo.findByArea(a._id)),
    );
    // Only sub-competencies covered by the test's scope are rated.
    const subsByArea = subsByAreaAll.map((subs) =>
      subs.filter((s) => isSubInScope(scope, s._id.toString())),
    );
    const allSubs = subsByArea.flat();
    const requiredLevels = await requiredLevelRepo.findCurrentForSubs(
      allSubs.map((s) => s._id),
    );

    const designation = assessment.designationAtCampaign.toString();
    const reqBySub = new Map<string, number>();
    for (const rl of requiredLevels) {
      if (rl.roleId.toString() === designation) {
        reqBySub.set(rl.subCompetencyId.toString(), rl.requiredLevel);
      }
    }
    const ratingBySub = new Map(
      assessment.managerAssessment.ratings.map((r) => [
        r.subCompetencyId.toString(),
        r,
      ]),
    );

    const areaNodes: RateArea[] = areas
      .map((area, i) => ({
        code: area.code,
        name: area.name,
        subs: (subsByArea[i] ?? []).map((sub) => {
          const key = sub._id.toString();
          const rating = ratingBySub.get(key);
          return {
            id: key,
            code: sub.code,
            name: sub.name,
            description: sub.description ?? null,
            requiredLevel: reqBySub.get(key) ?? null,
            indicators: sub.behavioralIndicators,
            rating: rating?.rating ?? null,
            evidence: rating?.evidence ?? null,
          };
        }),
      }))
      .filter((area) => area.subs.length > 0);

    return {
      assessmentId: assessment._id.toString(),
      employeeName: employee?.fullName ?? "Unknown",
      employeeRole: role?.name ?? "—",
      employeeDivision: employee?.division ?? "",
      status: assessment.managerAssessment.status,
      progress: assessment.managerAssessment.progress,
      totalSubs: allSubs.length,
      rated: assessment.managerAssessment.ratings.length,
      areas: areaNodes,
    };
  },

  /** Assessments where the actor is the employee being assessed. */
  async listMyAssessments(employeeId: ObjectId) {
    const assessments = await assessmentRepo.findForEmployee(employeeId);
    const out = [];
    for (const a of assessments) {
      const campaign = await campaignRepo.findById(a.campaignId);
      out.push({
        assessmentId: a._id.toString(),
        campaignName: campaign?.name ?? "—",
        deadline: campaign?.selfAssessmentDeadline ?? null,
        status: a.selfAssessment.status,
        progress: a.selfAssessment.progress,
      });
    }
    return out;
  },

  /**
   * Every unfinished assessment across the org — HR's outstanding backlog.
   * Spans both sources (one-on-one assignments and campaigns) and both sides:
   * still waiting on the employee's self-assessment, or submitted and waiting
   * on a rater. Newest sent first.
   */
  async listPendingOrgWide() {
    const assessments = await assessmentRepo.findUnfinished();
    if (assessments.length === 0) return [];

    const [employees, campaigns] = await Promise.all([
      // Names must resolve even for deactivated employees.
      userRepo.findManyByIdsAny(assessments.map((a) => a.employeeId)),
      campaignRepo.findAll(),
    ]);
    const employeeById = new Map(employees.map((u) => [u._id.toString(), u]));
    const campaignById = new Map(campaigns.map((c) => [c._id.toString(), c]));

    return assessments
      .map((a) => {
        const campaign = campaignById.get(a.campaignId.toString());
        const employee = employeeById.get(a.employeeId.toString());
        const isOneOnOne =
          campaign?.description === DIRECT_ASSIGNMENT_DESCRIPTION;
        return {
          assessmentId: a._id.toString(),
          campaignId: a.campaignId.toString(),
          employeeId: a.employeeId.toString(),
          employeeName: employee?.fullName ?? "Unknown",
          campaignName: campaign?.name ?? "—",
          type: isOneOnOne ? ("one_on_one" as const) : ("campaign" as const),
          sentAt: campaign?.startDate ?? null,
          deadline: campaign?.selfAssessmentDeadline ?? null,
          selfStatus: a.selfAssessment.status,
          managerStatus: a.managerAssessment.status,
          selfProgress: a.selfAssessment.progress,
          waitingOn:
            a.selfAssessment.status === STATUS.SUBMITTED
              ? ("manager" as const)
              : ("employee" as const),
        };
      })
      .sort((x, y) => {
        if (!x.sentAt) return 1;
        if (!y.sentAt) return -1;
        return y.sentAt.getTime() - x.sentAt.getTime();
      });
  },

  /** Full manager dashboard: KPIs, pending ratings, and team heatmap. */
  async getManagerDashboard(managerId: ObjectId): Promise<ManagerDashboard> {
    const assessments = await assessmentRepo.findForManager(managerId);
    const empty: ManagerDashboard = {
      cycleName: null,
      kpis: {
        teamCount: 0,
        ratingsComplete: 0,
        ratingsTotal: 0,
        daysLeft: null,
        criticalGaps: null,
      },
      rows: [],
      heatmap: { areas: [], rows: [], resultsAvailable: false },
    };
    if (assessments.length === 0) return empty;

    const [employees, roles, thresholds] = await Promise.all([
      userRepo.findManyByIds(assessments.map((a) => a.employeeId)),
      roleRepo.findAll(),
      settingsService.getThresholds(),
    ]);
    const empMap = new Map(employees.map((e) => [e._id.toString(), e]));
    const roleMap = new Map(roles.map((r) => [r._id.toString(), r]));

    // Campaigns (cache by id).
    const campaignCache = new Map<string, AssessmentCampaign | null>();
    async function campaignOf(id: ObjectId): Promise<AssessmentCampaign | null> {
      const key = id.toString();
      if (!campaignCache.has(key)) {
        campaignCache.set(key, await campaignRepo.findById(id));
      }
      return campaignCache.get(key) ?? null;
    }

    const rows: MgrTeamRow[] = [];
    let soonestDeadline: Date | null = null;
    let cycleName: string | null = null;
    for (const a of assessments) {
      const campaign = await campaignOf(a.campaignId);
      const emp = empMap.get(a.employeeId.toString());
      const role = emp ? roleMap.get(emp.designation?.toString() ?? "") : null;
      const deadline = campaign?.managerAssessmentDeadline ?? null;
      if (deadline && (!soonestDeadline || deadline < soonestDeadline)) {
        soonestDeadline = deadline;
        cycleName = campaign?.name ?? null;
      }
      rows.push({
        assessmentId: a._id.toString(),
        employeeName: emp?.fullName ?? "Unknown",
        roleName: role?.name ?? "—",
        division: emp?.division ?? "",
        status: a.managerAssessment.status,
        progress: a.managerAssessment.progress,
        daysLeft: daysLeftUntil(deadline),
      });
    }
    if (!cycleName) cycleName = campaignCache.values().next().value?.name ?? null;

    const ratingsComplete = assessments.filter(
      (a) => a.managerAssessment.status === "submitted",
    ).length;

    // Team heatmap (employees × areas) — fills in as results compute.
    const firstFamily = assessments[0]?.jobFamilyAtCampaign;
    const areas = firstFamily
      ? (await competencyAreaRepo.findByJobFamily(firstFamily)).sort(
          (a, b) => a.sequence - b.sequence,
        )
      : [];
    const areaOrder = areas.map((a) => a._id.toString());

    let criticalGaps = 0;
    let anyResults = false;
    const heatRows: MgrHeatmapRow[] = [];
    for (const a of assessments) {
      const results = await assessmentResultRepo.findByEmployeeAndCampaign(
        a.employeeId,
        a.campaignId,
      );
      const computed = results.filter((r) => r.managerLevel !== null);
      if (computed.length > 0) anyResults = true;
      criticalGaps += computed.filter(
        (r) => r.trafficLight === "critical",
      ).length;

      // Average gap/manager per area.
      const byArea = new Map<string, { gap: number; mgr: number; n: number }>();
      for (const r of computed) {
        const key = r.denormalized.areaId.toString();
        const acc = byArea.get(key) ?? { gap: 0, mgr: 0, n: 0 };
        acc.gap += r.gap ?? 0;
        acc.mgr += r.managerLevel ?? 0;
        acc.n += 1;
        byArea.set(key, acc);
      }
      const cells = areaOrder.map((areaId): MgrHeatmapCell | null => {
        const acc = byArea.get(areaId);
        if (!acc || acc.n === 0) return null;
        const gap = acc.gap / acc.n;
        return {
          gap: round2(gap),
          managerLevel: round2(acc.mgr / acc.n),
          trafficLight: getTrafficLight(gap, thresholds.gap),
        };
      });
      heatRows.push({
        employeeName: empMap.get(a.employeeId.toString())?.fullName ?? "Unknown",
        cells,
      });
    }

    return {
      cycleName,
      kpis: {
        teamCount: assessments.length,
        ratingsComplete,
        ratingsTotal: assessments.length,
        daysLeft: daysLeftUntil(soonestDeadline),
        criticalGaps: anyResults ? criticalGaps : null,
      },
      rows,
      heatmap: {
        areas: areas.map((a) => ({ code: a.code, name: a.name })),
        rows: heatRows,
        resultsAvailable: anyResults,
      },
    };
  },
};
