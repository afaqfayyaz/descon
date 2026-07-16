import type { ObjectId } from "mongodb";

import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { assessmentResultRepo } from "@/lib/db/repositories/assessment-result.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { analyticsService } from "@/lib/services/analytics.service";
import { resultsService } from "@/lib/services/results.service";
import { toCsv, slugify, type CsvCell } from "@/lib/utils/csv";
import { NotFoundError } from "@/lib/utils/errors";

export interface CsvFile {
  filename: string;
  content: string;
}

export const exportService = {
  /** Full per-sub-competency results for every participant in a campaign. */
  async campaignResultsCsv(campaignId: ObjectId): Promise<CsvFile> {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign");

    const [assessments, results] = await Promise.all([
      assessmentRepo.findByCampaign(campaignId),
      assessmentResultRepo.findByCampaign(campaignId),
    ]);

    const employees = await userRepo.findManyByIds(
      assessments.map((a) => a.employeeId),
    );
    const empMap = new Map(employees.map((e) => [e._id.toString(), e]));

    const jobFamilyId = campaign.jobFamilyIds[0];
    const areas = jobFamilyId
      ? await competencyAreaRepo.findByJobFamily(jobFamilyId)
      : [];
    const subs = await subCompetencyRepo.findByAreas(areas.map((a) => a._id));
    const subMap = new Map(subs.map((s) => [s._id.toString(), s]));
    const areaMap = new Map(areas.map((a) => [a._id.toString(), a]));

    const headers = [
      "Employee",
      "Division",
      "Area",
      "Sub-code",
      "Sub-competency",
      "Self level",
      "Manager level",
      "Required level",
      "Gap",
      "Traffic light",
      "Self-Mgr diff",
      "Calibration flag",
      "Calibration note",
    ];

    const rows: CsvCell[][] = results
      .map((r) => {
        const emp = empMap.get(r.employeeId.toString());
        const sub = subMap.get(r.subCompetencyId.toString());
        const area = sub ? areaMap.get(sub.areaId.toString()) : undefined;
        return {
          employee: emp?.fullName ?? "Unknown",
          division: r.denormalized.division,
          areaName: area?.name ?? "",
          subCode: sub?.code ?? "",
          subName: sub?.name ?? "",
          r,
        };
      })
      .sort(
        (a, b) =>
          a.employee.localeCompare(b.employee) ||
          a.subCode.localeCompare(b.subCode, undefined, { numeric: true }),
      )
      .map((x) => [
        x.employee,
        x.division,
        x.areaName,
        x.subCode,
        x.subName,
        x.r.selfLevel,
        x.r.managerLevel,
        x.r.requiredLevel || null,
        x.r.gap,
        x.r.trafficLight,
        x.r.difference,
        x.r.calibrationFlag,
        x.r.calibrationNote,
      ]);

    return {
      filename: `${slugify(campaign.name)}-results.csv`,
      content: toCsv(headers, rows),
    };
  },

  /** Competency-area × division gap heatmap as a matrix CSV. */
  async heatmapCsv(campaignId: ObjectId): Promise<CsvFile> {
    const data = await analyticsService.getCampaignHeatmap(campaignId);
    const headers = ["Area code", "Competency area", "Overall", ...data.divisions];
    const rows: CsvCell[][] = data.rows.map((row) => [
      row.areaCode,
      row.areaName,
      row.overall ? row.overall.avgGap : null,
      ...data.divisions.map((d) => {
        const c = row.cells[d];
        return c ? c.avgGap : null;
      }),
    ]);
    return {
      filename: `${slugify(data.campaignName)}-heatmap.csv`,
      content: toCsv(headers, rows),
    };
  },

  /** Calibration outliers list as CSV. */
  async calibrationCsv(campaignId: ObjectId): Promise<CsvFile> {
    const data = await analyticsService.getCalibrationOutliers(campaignId);
    const headers = [
      "Employee",
      "Division",
      "Area",
      "Sub-code",
      "Sub-competency",
      "Self level",
      "Manager level",
      "Self-Mgr diff",
      "Flag",
      "Note",
    ];
    const rows: CsvCell[][] = data.rows.map((r) => [
      r.employeeName,
      r.division,
      r.areaName,
      r.subCode,
      r.subName,
      r.selfLevel,
      r.managerLevel,
      r.difference,
      r.flag,
      r.note,
    ]);
    return {
      filename: `${slugify(data.campaignName)}-calibration.csv`,
      content: toCsv(headers, rows),
    };
  },

  /** One employee's full result detail as CSV. */
  async assessmentResultCsv(assessmentId: ObjectId): Promise<CsvFile> {
    const view = await resultsService.getAssessmentResultView(assessmentId);
    const headers = [
      "Area",
      "Sub-code",
      "Sub-competency",
      "Self level",
      "Manager level",
      "Required level",
      "Gap",
      "Traffic light",
      "Self-Mgr diff",
      "Calibration flag",
    ];
    const rows: CsvCell[][] = view.rows.map((r) => [
      r.areaName,
      r.subCode,
      r.subName,
      r.selfLevel,
      r.managerLevel,
      r.requiredLevel,
      r.gap,
      r.trafficLight,
      r.difference,
      r.calibrationFlag,
    ]);
    return {
      filename: `${slugify(view.employee.name)}-results.csv`,
      content: toCsv(headers, rows),
    };
  },
};
