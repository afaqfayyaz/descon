import Link from "next/link";
import { ObjectId } from "mongodb";
import { Sliders, Network, ListTree, HelpCircle } from "lucide-react";

import { requirePermission } from "@/lib/auth/permissions";
import { frameworkService } from "@/lib/services/framework.service";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import {
  AreasManager,
  type AreaRow,
} from "@/components/features/framework/areas-manager";
import {
  FamiliesManager,
  type FamilyRow,
} from "@/components/features/framework/families-manager";
import { CompetencyTree } from "@/components/features/framework/competency-tree";
import { KpiCard } from "@/components/shared/kpi-card";

export default async function FrameworkPage({
  searchParams,
}: {
  searchParams: { family?: string };
}) {
  await requirePermission("framework.view");
  const families = await frameworkService.listJobFamilies();

  // Resolve the selected family (query param, else first).
  const selected =
    (searchParams.family && ObjectId.isValid(searchParams.family)
      ? families.find((f) => f._id.toString() === searchParams.family)
      : families[0]) ?? families[0];

  // Area counts per family for the chips.
  const areaCounts = await Promise.all(
    families.map((f) => competencyAreaRepo.findByJobFamily(f._id)),
  );
  const familyRows: FamilyRow[] = families.map((f, i) => ({
    id: f._id.toString(),
    code: f.code,
    name: f.name,
    description: f.description,
    areaCount: areaCounts[i]?.length ?? 0,
  }));

  if (!selected) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Competency Framework
        </h1>
        <FamiliesManager families={familyRows} selectedId="" />
        <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center text-text-secondary">
          No job family yet. Create one above (or run <code>npm run seed</code>),
          then add competency areas, sub-competencies, and questions.
        </div>
      </div>
    );
  }

  const [areas, tree] = await Promise.all([
    competencyAreaRepo.findByJobFamily(selected._id),
    frameworkService.getFrameworkTree(selected._id),
  ]);
  const subsByArea = await Promise.all(
    areas.map((a) => subCompetencyRepo.findByArea(a._id)),
  );
  const rows: AreaRow[] = areas.map((a, i) => ({
    id: a._id.toString(),
    code: a.code,
    name: a.name,
    description: a.description,
    sequence: a.sequence,
    weight: a.weight,
    subCount: subsByArea[i]?.length ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Competency Framework
          </h1>
          <p className="text-sm text-text-secondary">
            {selected.name} ({selected.code}) · {rows.length} areas
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/required-levels"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken"
          >
            <Sliders className="h-4 w-4" /> Required levels
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Competency Areas"
          value={tree.totals.areas}
          icon={Network}
          hint={`in ${selected.code}`}
        />
        <KpiCard
          label="Sub-Competencies"
          value={tree.totals.subCompetencies}
          icon={ListTree}
          hint="across all areas"
        />
        <KpiCard
          label="Scenario Questions"
          value={tree.totals.questions}
          icon={HelpCircle}
          hint="in the question bank"
        />
      </div>

      <FamiliesManager families={familyRows} selectedId={selected._id.toString()} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Framework tree
        </h2>
        <CompetencyTree areas={tree.areas} roles={tree.roles} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Manage areas
        </h2>
        <AreasManager jobFamilyId={selected._id.toString()} areas={rows} />
      </section>
    </div>
  );
}
