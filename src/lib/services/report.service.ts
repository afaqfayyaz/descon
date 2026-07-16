import type { ObjectId } from "mongodb";

import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { assessmentResultRepo } from "@/lib/db/repositories/assessment-result.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { settingsService } from "@/lib/services/settings.service";
import { getTrafficLight } from "@/lib/domain/scoring/gap";
import { round2 } from "@/lib/domain/scoring/self-level";
import type { CsvCell } from "@/lib/utils/csv";
import type { AssessmentResult } from "@/lib/domain/types/assessment.types";
import { NotFoundError } from "@/lib/utils/errors";

/** The eight standard report templates (PRD FR-RPT-001). */
export const REPORT_TEMPLATES = [
  { key: "status-by-position", title: "Assessment Status by Position" },
  { key: "gap-by-position", title: "Gap Analysis by Position" },
  { key: "skill-gaps", title: "Skill Gaps Detail" },
  { key: "calibration", title: "Calibration Outliers" },
  { key: "team-roster", title: "Team Roster with KPIs" },
  { key: "division-summary", title: "Division Summary" },
  { key: "designation-summary", title: "Designation Summary" },
  { key: "capability-snapshot", title: "Overall Capability Snapshot" },
] as const;

export type ReportKey = (typeof REPORT_TEMPLATES)[number]["key"];

export function isReportKey(value: string): value is ReportKey {
  return REPORT_TEMPLATES.some((t) => t.key === value);
}

export interface ReportTable {
  title: string;
  campaignName: string;
  generatedAt: Date;
  headers: string[];
  rows: CsvCell[][];
  note?: string;
}

const TL_LABEL: Record<string, string> = {
  strong: "Strong",
  developing: "Developing",
  needs_focus: "Needs focus",
  critical: "Critical",
};

export const reportService = {
  async build(campaignId: ObjectId, key: ReportKey): Promise<ReportTable> {
    const campaign = await campaignRepo.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign");

    const [assessments, results, roles, thresholds] = await Promise.all([
      assessmentRepo.findByCampaign(campaignId),
      assessmentResultRepo.findByCampaign(campaignId),
      roleRepo.findAll(),
      settingsService.getThresholds(),
    ]);
    const gapT = thresholds.gap;

    const employees = await userRepo.findManyByIds(
      assessments.map((a) => a.employeeId),
    );
    const empMap = new Map(employees.map((e) => [e._id.toString(), e]));
    const roleMap = new Map(roles.map((r) => [r._id.toString(), r]));

    const jobFamilyId = campaign.jobFamilyIds[0];
    const areas = jobFamilyId
      ? (await competencyAreaRepo.findByJobFamily(jobFamilyId)).sort(
          (a, b) => a.sequence - b.sequence,
        )
      : [];
    const subs = await subCompetencyRepo.findByAreas(areas.map((a) => a._id));
    const subMap = new Map(subs.map((s) => [s._id.toString(), s]));
    const areaMap = new Map(areas.map((a) => [a._id.toString(), a]));

    const computed = results.filter((r) => r.managerLevel !== null);
    const base = {
      title: REPORT_TEMPLATES.find((t) => t.key === key)!.title,
      campaignName: campaign.name,
      generatedAt: new Date(),
    };

    const roleName = (id: ObjectId | undefined) =>
      id ? (roleMap.get(id.toString())?.name ?? "—") : "—";

    switch (key) {
      // ---------------------------------------------------------------- status
      case "status-by-position": {
        const byRole = new Map<
          string,
          { invited: number; self: number; mgr: number; complete: number }
        >();
        for (const a of assessments) {
          const key = a.designationAtCampaign?.toString() ?? "—";
          const acc =
            byRole.get(key) ?? { invited: 0, self: 0, mgr: 0, complete: 0 };
          acc.invited += 1;
          const selfDone = a.selfAssessment.status === "submitted";
          const mgrDone = a.managerAssessment.status === "submitted";
          if (selfDone) acc.self += 1;
          if (mgrDone) acc.mgr += 1;
          if (selfDone && mgrDone) acc.complete += 1;
          byRole.set(key, acc);
        }
        const rows: CsvCell[][] = [...byRole.entries()].map(([rid, v]) => [
          roleMap.get(rid)?.name ?? "—",
          v.invited,
          v.self,
          v.mgr,
          v.complete,
          `${Math.round((v.complete / v.invited) * 100)}%`,
        ]);
        return {
          ...base,
          headers: [
            "Position",
            "Invited",
            "Self submitted",
            "Manager submitted",
            "Complete",
            "% complete",
          ],
          rows,
        };
      }

      // ----------------------------------------------------- gap by position
      case "gap-by-position": {
        // Position × competency area average gap.
        const acc = new Map<string, Map<string, { gap: number; n: number }>>();
        for (const r of computed) {
          const rid = r.denormalized.designation?.toString() ?? "—";
          const aid = r.denormalized.areaId.toString();
          if (!acc.has(rid)) acc.set(rid, new Map());
          const inner = acc.get(rid)!;
          const cell = inner.get(aid) ?? { gap: 0, n: 0 };
          cell.gap += r.gap ?? 0;
          cell.n += 1;
          inner.set(aid, cell);
        }
        const rows: CsvCell[][] = [...acc.entries()].map(([rid, inner]) => [
          roleMap.get(rid)?.name ?? "—",
          ...areas.map((a) => {
            const c = inner.get(a._id.toString());
            return c && c.n > 0 ? round2(c.gap / c.n) : null;
          }),
        ]);
        return {
          ...base,
          headers: ["Position", ...areas.map((a) => `${a.code} ${a.name}`)],
          rows,
          note: "Average gap (required − manager) per competency area.",
        };
      }

      // ------------------------------------------------------------ skill gaps
      case "skill-gaps": {
        const acc = new Map<
          string,
          { self: number; mgr: number; req: number; gap: number; n: number }
        >();
        for (const r of computed) {
          const sid = r.subCompetencyId.toString();
          const cell =
            acc.get(sid) ?? { self: 0, mgr: 0, req: 0, gap: 0, n: 0 };
          cell.self += r.selfLevel ?? 0;
          cell.mgr += r.managerLevel ?? 0;
          cell.req += r.requiredLevel ?? 0;
          cell.gap += r.gap ?? 0;
          cell.n += 1;
          acc.set(sid, cell);
        }
        const rows = [...acc.entries()]
          .map(([sid, v]) => {
            const sub = subMap.get(sid);
            const area = sub ? areaMap.get(sub.areaId.toString()) : undefined;
            const avgGap = v.gap / v.n;
            return {
              areaName: area?.name ?? "—",
              subCode: sub?.code ?? "?",
              subName: sub?.name ?? "Unknown",
              avgSelf: round2(v.self / v.n),
              avgMgr: round2(v.mgr / v.n),
              avgReq: round2(v.req / v.n),
              avgGap: round2(avgGap),
              status: TL_LABEL[getTrafficLight(avgGap, gapT)] ?? "—",
            };
          })
          .sort((a, b) => b.avgGap - a.avgGap);
        return {
          ...base,
          headers: [
            "Area",
            "Sub-code",
            "Sub-competency",
            "Avg self",
            "Avg manager",
            "Avg required",
            "Avg gap",
            "Status",
          ],
          rows: rows.map((r) => [
            r.areaName,
            r.subCode,
            r.subName,
            r.avgSelf,
            r.avgMgr,
            r.avgReq,
            r.avgGap,
            r.status,
          ]),
        };
      }

      // ----------------------------------------------------------- calibration
      case "calibration": {
        const outliers = results.filter(
          (r) =>
            r.calibrationFlag === "minor_outlier" ||
            r.calibrationFlag === "major_outlier",
        );
        const rows = outliers
          .map((r) => {
            const emp = empMap.get(r.employeeId.toString());
            const sub = subMap.get(r.subCompetencyId.toString());
            const area = sub ? areaMap.get(sub.areaId.toString()) : undefined;
            return {
              employee: emp?.fullName ?? "Unknown",
              division: r.denormalized.division,
              areaName: area?.name ?? "—",
              subCode: sub?.code ?? "?",
              subName: sub?.name ?? "Unknown",
              self: r.selfLevel,
              mgr: r.managerLevel,
              diff: r.difference,
              flag: r.calibrationFlag,
            };
          })
          .sort((a, b) => Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0));
        return {
          ...base,
          headers: [
            "Employee",
            "Division",
            "Area",
            "Sub-code",
            "Sub-competency",
            "Self level",
            "Manager level",
            "Self-Mgr diff",
            "Flag",
          ],
          rows: rows.map((r) => [
            r.employee,
            r.division,
            r.areaName,
            r.subCode,
            r.subName,
            r.self,
            r.mgr,
            r.diff,
            r.flag,
          ]),
        };
      }

      // ----------------------------------------------------------- team roster
      case "team-roster": {
        const byEmp = new Map<
          string,
          { mgr: number; gap: number; n: number; critical: number }
        >();
        for (const r of computed) {
          const eid = r.employeeId.toString();
          const cell =
            byEmp.get(eid) ?? { mgr: 0, gap: 0, n: 0, critical: 0 };
          cell.mgr += r.managerLevel ?? 0;
          cell.gap += r.gap ?? 0;
          cell.n += 1;
          if (r.trafficLight === "critical") cell.critical += 1;
          byEmp.set(eid, cell);
        }
        const rows: CsvCell[][] = assessments
          .map((a) => {
            const emp = empMap.get(a.employeeId.toString());
            const v = byEmp.get(a.employeeId.toString());
            const capability =
              v && v.n > 0 ? Math.round((v.mgr / v.n / 5) * 100) : null;
            return {
              name: emp?.fullName ?? "Unknown",
              division: emp?.division ?? "",
              position: roleName(a.designationAtCampaign),
              capability,
              avgGap: v && v.n > 0 ? round2(v.gap / v.n) : null,
              critical: v?.critical ?? 0,
              self: a.selfAssessment.status,
              mgr: a.managerAssessment.status,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((r) => [
            r.name,
            r.division,
            r.position,
            r.capability === null ? null : `${r.capability}%`,
            r.avgGap,
            r.critical,
            r.self,
            r.mgr,
          ]);
        return {
          ...base,
          headers: [
            "Employee",
            "Division",
            "Position",
            "Capability %",
            "Avg gap",
            "Critical gaps",
            "Self status",
            "Manager status",
          ],
          rows,
        };
      }

      // ------------------------------------------------------ division summary
      case "division-summary": {
        const rows = aggregateByKey(
          computed,
          (r) => r.denormalized.division || "—",
          gapT,
        );
        return {
          ...base,
          headers: [
            "Division",
            "Employees",
            "Avg manager",
            "Avg required",
            "Avg gap",
            "Status",
            "Critical gaps",
          ],
          rows,
        };
      }

      // --------------------------------------------------- designation summary
      case "designation-summary": {
        const rows = aggregateByKey(
          computed,
          (r) => roleName(r.denormalized.designation),
          gapT,
        );
        return {
          ...base,
          headers: [
            "Designation",
            "Employees",
            "Avg manager",
            "Avg required",
            "Avg gap",
            "Status",
            "Critical gaps",
          ],
          rows,
        };
      }

      // -------------------------------------------------- capability snapshot
      case "capability-snapshot": {
        const n = computed.length;
        const sumMgr = computed.reduce((s, r) => s + (r.managerLevel ?? 0), 0);
        const sumGap = computed.reduce((s, r) => s + (r.gap ?? 0), 0);
        const critical = computed.filter(
          (r) => r.trafficLight === "critical",
        ).length;
        const employeesAssessed = new Set(
          computed.map((r) => r.employeeId.toString()),
        ).size;
        const avgMgr = n > 0 ? sumMgr / n : 0;
        const rows: CsvCell[][] = [
          ["Employees assessed", employeesAssessed],
          ["Total ratings", n],
          ["Overall capability %", n > 0 ? `${Math.round((avgMgr / 5) * 100)}%` : "—"],
          ["Average manager level", n > 0 ? round2(avgMgr) : "—"],
          ["Average gap", n > 0 ? round2(sumGap / n) : "—"],
          [
            "Critical gaps (%)",
            n > 0 ? `${Math.round((critical / n) * 100)}%` : "—",
          ],
          ["Critical gap count", critical],
        ];
        return { ...base, headers: ["Metric", "Value"], rows };
      }
    }
  },
};

/** Shared aggregation for division/designation summaries. */
function aggregateByKey(
  computed: AssessmentResult[],
  keyOf: (r: AssessmentResult) => string,
  gapT: Parameters<typeof getTrafficLight>[1],
): CsvCell[][] {
  const acc = new Map<
    string,
    {
      mgr: number;
      req: number;
      gap: number;
      n: number;
      critical: number;
      emps: Set<string>;
    }
  >();
  for (const r of computed) {
    const k = keyOf(r);
    const cell =
      acc.get(k) ??
      { mgr: 0, req: 0, gap: 0, n: 0, critical: 0, emps: new Set<string>() };
    cell.mgr += r.managerLevel ?? 0;
    cell.req += r.requiredLevel ?? 0;
    cell.gap += r.gap ?? 0;
    cell.n += 1;
    if (r.trafficLight === "critical") cell.critical += 1;
    cell.emps.add(r.employeeId.toString());
    acc.set(k, cell);
  }
  const TL: Record<string, string> = {
    strong: "Strong",
    developing: "Developing",
    needs_focus: "Needs focus",
    critical: "Critical",
  };
  return [...acc.entries()]
    .map(([k, v]) => {
      const avgGap = v.gap / v.n;
      return [
        k,
        v.emps.size,
        round2(v.mgr / v.n),
        round2(v.req / v.n),
        round2(avgGap),
        TL[getTrafficLight(avgGap, gapT)] ?? "—",
        v.critical,
      ] as CsvCell[];
    })
    .sort((a, b) => Number(b[4]) - Number(a[4]));
}
