import { requirePermission } from "@/lib/auth/permissions";
import { frameworkService } from "@/lib/services/framework.service";
import {
  RequiredLevelsMatrix,
  type MatrixRole,
  type MatrixRow,
} from "@/components/features/framework/required-levels-matrix";

export default async function RequiredLevelsPage() {
  await requirePermission("framework.view");
  const tree = await frameworkService.getFrameworkTree();

  const roles: MatrixRole[] = tree.roles;
  const rows: MatrixRow[] = [];
  for (const area of tree.areas) {
    for (const sub of area.subCompetencies) {
      rows.push({
        subId: sub.id,
        subCode: sub.code,
        subName: sub.name,
        areaCode: area.code,
        areaName: area.name,
        values: sub.requiredByRole,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Required Levels</h1>
        <p className="text-sm text-slate-500">
          {tree.jobFamily?.name ?? "Framework"} · {rows.length} sub-competencies
          × {roles.length} designations
        </p>
      </div>

      {rows.length === 0 || roles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Add sub-competencies and designations first.
        </div>
      ) : (
        <RequiredLevelsMatrix roles={roles} rows={rows} />
      )}
    </div>
  );
}
