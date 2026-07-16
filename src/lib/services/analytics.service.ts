import type { ObjectId } from "mongodb";

import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { assessmentResultRepo } from "@/lib/db/repositories/assessment-result.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { getTrafficLight, type GapThresholds } from "@/lib/domain/scoring/gap";
import { round2 } from "@/lib/domain/scoring/self-level";
import { settingsService } from "@/lib/services/settings.service";
import type { TrafficLight, CalibrationFlag } from "@/lib/domain/constants";
import { NotFoundError } from "@/lib/utils/errors";

export interface HeatmapCell {
  avgGap: number;
  avgManager: number;
  trafficLight: TrafficLight;
  count: number;
}

export interface HeatmapRow {
  areaName: string;
  areaCode: string;
  overall: HeatmapCell | null;
  cells: Record<string, HeatmapCell | null>; // keyed by division
}

export interface CampaignHeatmap {
  campaignName: string;
  status: string;
  divisions: string[];
  rows: HeatmapRow[];
  resultsAvailable: boolean;
}

export interface OutlierRow {
  assessmentId: string;
  subCompetencyId: string;
  employeeName: string;
  division: string;
  areaName: string;
  subCode: string;
  subName: string;
  selfLevel: number | null;
  managerLevel: number | null;
  difference: number | null;
  requiredLevel: number | null;
  flag: CalibrationFlag;
  note: string | null;
}

export interface CalibrationView {
  campaignName: string;
  status: string;
  total: number;
  major: number;
  minor: number;
  rows: OutlierRow[];
}

function cellFrom(
  avgGap: number,
  avgManager: number,
  count: number,
  thresholds: GapThresholds,
): HeatmapCell {
  return {
    avgGap: round2(avgGap),
    avgManager: round2(avgManager),
    trafficLight: getTrafficLight(avgGap, thresholds),
    count,
  };
}

export interface RadarPoint {
  area: string;
  manager: number;
  required: number;
}
export interface BarPoint {
  label: string;
  value: number;
  color?: string;
}
export interface GroupedPoint {
  category: string;
  required: number;
  current: number;
  gap: number;
  count: number;
}
export interface EmployeeOverviewRow {
  assessmentId: string | null;
  employeeId: string;
  name: string;
  division: string;
  designation: string;
  required: number;
  current: number;
  gap: number;
  trafficLight: TrafficLight;
}
export interface CampaignDashboard {
  campaignName: string;
  status: string;
  resultsAvailable: boolean;
  kpis: {
    participants: number;
    scored: number;
    avgRequired: number;
    avgCurrent: number;
    avgGap: number;
    capabilityPercent: number;
  };
  distribution: { label: string; value: number; color: string }[];
  areaRadar: RadarPoint[];
  areaGaps: BarPoint[];
  byDivision: GroupedPoint[];
  byDesignation: GroupedPoint[];
  employees: EmployeeOverviewRow[];
}

const TRAFFIC_META: Record<TrafficLight, { label: string; color: string }> = {
  strong: { label: "No / small gap", color: "#22c55e" },
  developing: { label: "Developing", color: "#eab308" },
  needs_focus: { label: "Needs focus", color: "#f97316" },
  critical: { label: "Critical", color: "#ef4444" },
};

export const analyticsService = {
  /**
   * Full analytics bundle for one campaign: KPIs (required/current/gap +
   * capability %), competency-area radar + gap bars, traffic-light
   * distribution, division & designation Required-vs-Current comparisons, and
   * a per-employee overview — the on-screen equivalent of the Excel Dashboard /
   * PM Family Summary tabs.
   */
  async getCampaignDashboard(campaignId: ObjectId): Promise<CampaignDashboard> {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign");

    const jobFamilyId = campaign.jobFamilyIds[0];
    const [areas, byArea, byEmployee, byDivision, byDesignation, overall, thresholds, roles] =
      await Promise.all([
        jobFamilyId ? competencyAreaRepo.findByJobFamily(jobFamilyId) : [],
        assessmentResultRepo.aggregateByArea(campaignId),
        assessmentResultRepo.aggregateByEmployee(campaignId),
        assessmentResultRepo.aggregateByDivisionForCampaigns([campaignId]),
        assessmentResultRepo.aggregateByDesignation(campaignId),
        assessmentResultRepo.overallStatsForCampaigns([campaignId]),
        settingsService.getThresholds(),
        roleRepo.findAll(),
      ]);
    const gapT = thresholds.gap;
    const roleName = new Map(roles.map((r) => [r._id.toString(), r.name]));

    const areaMap = new Map(areas.map((a) => [a._id.toString(), a]));
    const orderedAreas = [...areas].sort((a, b) => a.sequence - b.sequence);

    const areaRadar: RadarPoint[] = orderedAreas
      .map((area) => {
        const agg = byArea.find((x) => x.areaId.toString() === area._id.toString());
        if (!agg) return null;
        return {
          area: area.code,
          manager: round2(agg.avgManager),
          required: round2(agg.avgRequired),
        };
      })
      .filter((x): x is RadarPoint => x !== null);

    const areaGaps: BarPoint[] = [...byArea]
      .map((agg) => ({
        label: areaMap.get(agg.areaId.toString())?.name ?? "—",
        value: round2(agg.avgGap),
        color: TRAFFIC_META[getTrafficLight(agg.avgGap, gapT)].color,
      }))
      .sort((a, b) => b.value - a.value);

    // Per-employee overview + traffic-light distribution.
    const employeeIds = byEmployee.map((e) => e.employeeId);
    const employees = await userRepo.findManyByIds(employeeIds);
    const empMap = new Map(employees.map((e) => [e._id.toString(), e]));
    const assessments = await assessmentRepo.findByCampaign(campaignId);
    const assessmentByEmp = new Map(
      assessments.map((a) => [a.employeeId.toString(), a._id.toString()]),
    );

    const distCounts: Record<TrafficLight, number> = {
      strong: 0,
      developing: 0,
      needs_focus: 0,
      critical: 0,
    };
    const employeeRows: EmployeeOverviewRow[] = byEmployee
      .map((e) => {
        const emp = empMap.get(e.employeeId.toString());
        const tl = getTrafficLight(e.avgGap, gapT);
        distCounts[tl] += 1;
        return {
          assessmentId: assessmentByEmp.get(e.employeeId.toString()) ?? null,
          employeeId: e.employeeId.toString(),
          name: emp?.fullName ?? "Unknown",
          division: e.division,
          designation: roleName.get(e.designation?.toString() ?? "") ?? "—",
          required: round2(e.avgRequired),
          current: round2(e.avgManager),
          gap: round2(e.avgGap),
          trafficLight: tl,
        };
      })
      .sort((a, b) => b.gap - a.gap);

    const distribution = (
      ["strong", "developing", "needs_focus", "critical"] as TrafficLight[]
    ).map((tl) => ({
      label: TRAFFIC_META[tl].label,
      value: distCounts[tl],
      color: TRAFFIC_META[tl].color,
    }));

    const byDivisionPoints: GroupedPoint[] = byDivision
      .map((d) => ({
        category: d.division,
        required: round2(d.avgManager + d.avgGap),
        current: round2(d.avgManager),
        gap: round2(d.avgGap),
        count: d.count,
      }))
      .sort((a, b) => b.gap - a.gap);

    const byDesignationPoints: GroupedPoint[] = byDesignation
      .map((d) => ({
        category: roleName.get(d.designation?.toString() ?? "") ?? "—",
        required: round2(d.avgRequired),
        current: round2(d.avgManager),
        gap: round2(d.avgGap),
        count: d.count,
      }))
      .sort((a, b) => b.gap - a.gap);

    const avgRequired = overall ? round2(overall.avgRequired) : 0;
    const avgCurrent = overall ? round2(overall.avgManager) : 0;
    const avgGap = overall ? round2(overall.avgGap) : 0;
    const capabilityPercent =
      avgRequired > 0 ? Math.round((avgCurrent / avgRequired) * 100) : 0;

    return {
      campaignName: campaign.name,
      status: campaign.status,
      resultsAvailable: byArea.length > 0,
      kpis: {
        participants: campaign.stats.totalParticipants,
        scored: byEmployee.length,
        avgRequired,
        avgCurrent,
        avgGap,
        capabilityPercent,
      },
      distribution,
      areaRadar,
      areaGaps,
      byDivision: byDivisionPoints,
      byDesignation: byDesignationPoints,
      employees: employeeRows,
    };
  },

  /** Competency-area × division gap heatmap for a campaign. */
  async getCampaignHeatmap(campaignId: ObjectId): Promise<CampaignHeatmap> {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign");

    const jobFamilyId = campaign.jobFamilyIds[0];
    const areas = jobFamilyId
      ? await competencyAreaRepo.findByJobFamily(jobFamilyId)
      : [];

    const [byCell, byArea, thresholds] = await Promise.all([
      assessmentResultRepo.aggregateByAreaDivision(campaignId),
      assessmentResultRepo.aggregateByArea(campaignId),
      settingsService.getThresholds(),
    ]);
    const gapThresholds = thresholds.gap;

    const divisions = [...new Set(byCell.map((c) => c.division))].sort();
    const overallByArea = new Map(byArea.map((a) => [a.areaId.toString(), a]));

    const cellLookup = new Map<string, (typeof byCell)[number]>();
    for (const c of byCell) {
      cellLookup.set(`${c.areaId.toString()}::${c.division}`, c);
    }

    const rows: HeatmapRow[] = areas
      .sort((a, b) => a.sequence - b.sequence)
      .map((area) => {
        const cells: Record<string, HeatmapCell | null> = {};
        for (const div of divisions) {
          const c = cellLookup.get(`${area._id.toString()}::${div}`);
          cells[div] = c
            ? cellFrom(c.avgGap, c.avgManager, c.count, gapThresholds)
            : null;
        }
        const o = overallByArea.get(area._id.toString());
        return {
          areaName: area.name,
          areaCode: area.code,
          overall: o
            ? cellFrom(o.avgGap, o.avgManager, o.count, gapThresholds)
            : null,
          cells,
        };
      });

    return {
      campaignName: campaign.name,
      status: campaign.status,
      divisions,
      rows,
      resultsAvailable: byArea.length > 0,
    };
  },

  /** Calibration outliers (self vs manager disagreements) for review. */
  async getCalibrationOutliers(campaignId: ObjectId): Promise<CalibrationView> {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign");

    const outliers = await assessmentResultRepo.findOutliers(campaignId);

    const jobFamilyId = campaign.jobFamilyIds[0];
    const areas = jobFamilyId
      ? await competencyAreaRepo.findByJobFamily(jobFamilyId)
      : [];
    const subs = await subCompetencyRepo.findByAreas(areas.map((a) => a._id));
    const subMap = new Map(subs.map((s) => [s._id.toString(), s]));
    const areaMap = new Map(areas.map((a) => [a._id.toString(), a]));

    const uniqueEmpIds = new Map(
      outliers.map((o) => [o.employeeId.toString(), o.employeeId]),
    );
    const employees = await userRepo.findManyByIds([...uniqueEmpIds.values()]);
    const empMap = new Map(employees.map((e) => [e._id.toString(), e]));

    const rows: OutlierRow[] = outliers
      .map((o) => {
        const sub = subMap.get(o.subCompetencyId.toString());
        const area = sub ? areaMap.get(sub.areaId.toString()) : undefined;
        const emp = empMap.get(o.employeeId.toString());
        return {
          assessmentId: o.assessmentId.toString(),
          subCompetencyId: o.subCompetencyId.toString(),
          employeeName: emp?.fullName ?? "Unknown",
          division: o.denormalized.division,
          areaName: area?.name ?? "—",
          subCode: sub?.code ?? "?",
          subName: sub?.name ?? "Unknown",
          selfLevel: o.selfLevel,
          managerLevel: o.managerLevel,
          difference: o.difference,
          requiredLevel: o.requiredLevel || null,
          flag: o.calibrationFlag ?? "none",
          note: o.calibrationNote,
        };
      })
      .sort(
        (a, b) =>
          Math.abs(b.difference ?? 0) - Math.abs(a.difference ?? 0) ||
          a.employeeName.localeCompare(b.employeeName),
      );

    return {
      campaignName: campaign.name,
      status: campaign.status,
      total: rows.length,
      major: rows.filter((r) => r.flag === "major_outlier").length,
      minor: rows.filter((r) => r.flag === "minor_outlier").length,
      rows,
    };
  },
};
