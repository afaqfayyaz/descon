import { assessmentResultRepo } from "@/lib/db/repositories/assessment-result.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { getTrafficLight } from "@/lib/domain/scoring/gap";
import { round2 } from "@/lib/domain/scoring/self-level";
import { settingsService } from "@/lib/services/settings.service";
import type { TrafficLight } from "@/lib/domain/constants";

export interface TopGap {
  subCode: string;
  subName: string;
  avgGap: number;
  avgManager: number;
  avgRequired: number;
  trafficLight: TrafficLight;
  count: number;
}

export interface DivisionRow {
  division: string;
  avgGap: number;
  avgManager: number;
  avgRequired: number;
  trafficLight: TrafficLight;
  critical: number;
  count: number;
}

export interface CampaignTrend {
  campaignId: string;
  name: string;
  startDate: Date;
  status: string;
  participants: number;
  finalized: number;
  avgGap: number | null;
  avgManager: number | null;
  trafficLight: TrafficLight | null;
}

export interface AreaRadarRow {
  area: string;
  manager: number;
  /** Average self rating — the third series on the source profile chart. */
  self: number | null;
  required: number;
}
export interface DesignationRow {
  designation: string;
  required: number;
  current: number;
  gap: number;
  count: number;
}
export interface DistributionSlice {
  label: string;
  value: number;
  color: string;
}

export interface ExecutiveOverview {
  hasData: boolean;
  kpis: {
    campaigns: number;
    employeesAssessed: number;
    avgCapabilityPercent: number;
    criticalGaps: number;
    avgRequired: number;
    avgCurrent: number;
    avgGap: number;
    /** Overall status of the org-wide average gap (drives the board message). */
    trafficLight: TrafficLight;
  };
  topGaps: TopGap[];
  strengths: TopGap[];
  divisions: DivisionRow[];
  designations: DesignationRow[];
  areaRadar: AreaRadarRow[];
  distribution: DistributionSlice[];
  trends: CampaignTrend[];
}

const TRAFFIC_META: Record<TrafficLight, { label: string; color: string }> = {
  strong: { label: "No / small gap", color: "#22c55e" },
  developing: { label: "Developing", color: "#eab308" },
  needs_focus: { label: "Needs focus", color: "#f97316" },
  critical: { label: "Critical", color: "#ef4444" },
};

export const executiveService = {
  async getOverview(): Promise<ExecutiveOverview> {
    const campaigns = await campaignRepo.findAll();
    const launched = campaigns.filter((c) => c.status !== "draft");
    const campaignIds = launched.map((c) => c._id);

    const empty: ExecutiveOverview = {
      hasData: false,
      kpis: {
        campaigns: launched.length,
        employeesAssessed: 0,
        avgCapabilityPercent: 0,
        criticalGaps: 0,
        avgRequired: 0,
        avgCurrent: 0,
        avgGap: 0,
        trafficLight: "strong",
      },
      topGaps: [],
      strengths: [],
      divisions: [],
      designations: [],
      areaRadar: [],
      distribution: [],
      trends: [],
    };
    if (campaignIds.length === 0) return empty;

    const [
      overall,
      bySub,
      byDivision,
      byCampaign,
      byArea,
      byDesignation,
      byEmployee,
      thresholds,
      roles,
    ] = await Promise.all([
      assessmentResultRepo.overallStatsForCampaigns(campaignIds),
      assessmentResultRepo.aggregateBySubForCampaigns(campaignIds),
      assessmentResultRepo.aggregateByDivisionForCampaigns(campaignIds),
      assessmentResultRepo.aggregateByCampaign(campaignIds),
      assessmentResultRepo.aggregateByAreaForCampaigns(campaignIds),
      assessmentResultRepo.aggregateByDesignationForCampaigns(campaignIds),
      assessmentResultRepo.aggregateByEmployeeForCampaigns(campaignIds),
      settingsService.getThresholds(),
      roleRepo.findAll(),
    ]);
    if (!overall) return empty;
    const gapThresholds = thresholds.gap;
    const roleName = new Map(roles.map((r) => [r._id.toString(), r.name]));

    const subs = await subCompetencyRepo.findByIds(
      bySub.map((s) => s.subCompetencyId),
    );
    const subMap = new Map(subs.map((s) => [s._id.toString(), s]));

    const subRows: TopGap[] = bySub.map((s) => {
      const sub = subMap.get(s.subCompetencyId.toString());
      return {
        subCode: sub?.code ?? "?",
        subName: sub?.name ?? "Unknown",
        avgGap: round2(s.avgGap),
        avgManager: round2(s.avgManager),
        avgRequired: round2(s.avgRequired),
        trafficLight: getTrafficLight(s.avgGap, gapThresholds),
        count: s.count,
      };
    });

    const sortedByGap = [...subRows].sort((a, b) => b.avgGap - a.avgGap);
    const topGaps = sortedByGap.slice(0, 8);
    const strengths = [...subRows]
      .sort((a, b) => a.avgGap - b.avgGap)
      .slice(0, 5);

    const divisions: DivisionRow[] = byDivision
      .map((d) => ({
        division: d.division,
        avgGap: round2(d.avgGap),
        avgManager: round2(d.avgManager),
        avgRequired: round2(d.avgRequired),
        trafficLight: getTrafficLight(d.avgGap, gapThresholds),
        critical: d.critical,
        count: d.count,
      }))
      .sort((a, b) => b.avgGap - a.avgGap);

    const trendBySub = new Map(byCampaign.map((c) => [c.campaignId.toString(), c]));
    const trends: CampaignTrend[] = launched
      .map((c) => {
        const agg = trendBySub.get(c._id.toString());
        return {
          campaignId: c._id.toString(),
          name: c.name,
          startDate: c.startDate,
          status: c.status,
          participants: c.stats.totalParticipants,
          finalized: c.stats.finalized,
          avgGap: agg ? round2(agg.avgGap) : null,
          avgManager: agg ? round2(agg.avgManager) : null,
          trafficLight: agg ? getTrafficLight(agg.avgGap, gapThresholds) : null,
        };
      })
      .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));

    const employeesAssessed = new Set(
      // approximate distinct employees via campaign participants
      launched.flatMap((c) => c.participantIds.map((p) => p.toString())),
    ).size;

    const avgCapabilityPercent =
      overall.avgRequired > 0
        ? Math.round((overall.avgManager / overall.avgRequired) * 100)
        : 0;

    // Org-wide competency-area radar (Required vs Current).
    const areaIds = byArea.map((a) => a.areaId);
    const areas = await competencyAreaRepo.findByIds(areaIds);
    const areaMap = new Map(areas.map((a) => [a._id.toString(), a]));
    const areaRadar: AreaRadarRow[] = byArea
      .map((a) => ({
        // The axis label must carry meaning on its own — the source
        // PetroSkills profile labels each vertex with the area name, not a
        // bare code number (the chart wraps/truncates long names itself).
        area:
          areaMap.get(a.areaId.toString())?.name ??
          areaMap.get(a.areaId.toString())?.code ??
          "—",
        sequence: areaMap.get(a.areaId.toString())?.sequence ?? 999,
        manager: round2(a.avgManager),
        self: a.avgSelf !== null ? round2(a.avgSelf) : null,
        required: round2(a.avgRequired),
      }))
      .sort((a, b) => a.sequence - b.sequence)
      .map(({ area, manager, self, required }) => ({ area, manager, self, required }));

    // Designation-wise Required vs Current.
    const designations: DesignationRow[] = byDesignation
      .map((d) => ({
        designation: roleName.get(d.designation?.toString() ?? "") ?? "—",
        required: round2(d.avgRequired),
        current: round2(d.avgManager),
        gap: round2(d.avgGap),
        count: d.count,
      }))
      .sort((a, b) => b.gap - a.gap);

    // Org-wide traffic-light distribution (per assessed employee).
    const distCounts: Record<TrafficLight, number> = {
      strong: 0,
      developing: 0,
      needs_focus: 0,
      critical: 0,
    };
    for (const e of byEmployee) {
      distCounts[getTrafficLight(e.avgGap, gapThresholds)] += 1;
    }
    const distribution: DistributionSlice[] = (
      ["strong", "developing", "needs_focus", "critical"] as TrafficLight[]
    ).map((tl) => ({
      label: TRAFFIC_META[tl].label,
      value: distCounts[tl],
      color: TRAFFIC_META[tl].color,
    }));

    return {
      hasData: true,
      kpis: {
        campaigns: launched.length,
        employeesAssessed,
        avgCapabilityPercent,
        criticalGaps: overall.critical,
        trafficLight: getTrafficLight(overall.avgGap, gapThresholds),
        avgRequired: round2(overall.avgRequired),
        avgCurrent: round2(overall.avgManager),
        avgGap: round2(overall.avgGap),
      },
      topGaps,
      strengths,
      divisions,
      designations,
      areaRadar,
      distribution,
      trends,
    };
  },
};
