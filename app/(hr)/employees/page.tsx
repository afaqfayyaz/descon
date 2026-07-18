import Link from "next/link";
import { ObjectId } from "mongodb";
import { Layers, Users, Building2, UserCog } from "lucide-react";
import { requirePermission } from "@/lib/auth/permissions";
import { employeeService } from "@/lib/services/employee.service";
import { resultsService } from "@/lib/services/results.service";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { jobFamilyRepo } from "@/lib/db/repositories/job-family.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { TabLinks, type TabLink } from "@/components/dashboard/dashboard-tabs";
import {
  EmployeesManager,
  type Option,
} from "@/components/features/employees/employees-manager";
import { KpiCard } from "@/components/shared/kpi-card";
import type { SystemRole } from "@/lib/domain/constants";

const LIMIT = 20;

/**
 * Directory category tabs (driven by RBAC roles, not a separate field). Staff
 * only — admin and executive accounts are application users and are managed
 * under Settings → Application users, not here.
 */
const CATEGORIES: {
  id: string;
  label: string;
  role?: SystemRole;
  onlyInactive?: boolean;
}[] = [
  { id: "all", label: "All" },
  { id: "employee", label: "Employees", role: "employee" },
  { id: "line_manager", label: "Line Managers", role: "line_manager" },
  { id: "inactive", label: "Deactivated", onlyInactive: true },
];

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    page?: string;
    role?: string;
    division?: string;
    designation?: string;
  };
}) {
  await requirePermission("user.manage");

  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const search = searchParams.search?.trim() ?? "";
  const division = searchParams.division?.trim() || undefined;
  const designation =
    searchParams.designation && ObjectId.isValid(searchParams.designation)
      ? new ObjectId(searchParams.designation)
      : undefined;
  const activeCat =
    CATEGORIES.find((c) => c.id === searchParams.role) ?? CATEGORIES[0]!;
  const baseFilter = {
    search: search || undefined,
    division,
    designation,
    role: activeCat.role,
    kind: "staff" as const,
    onlyInactive: activeCat.onlyInactive,
  };

  const [{ items, total }, roles, families, allUsers, divisions, counts] =
    await Promise.all([
      employeeService.list(baseFilter, { page, limit: LIMIT }),
      roleRepo.findAll(),
      jobFamilyRepo.findAll(),
      userRepo.findMany({ kind: "staff" }, { page: 1, limit: 500 }),
      userRepo.distinctDivisions(),
      Promise.all(
        CATEGORIES.map((c) =>
          userRepo.count({
            search: search || undefined,
            division,
            designation,
            role: c.role,
            kind: "staff",
            onlyInactive: c.onlyInactive,
          }),
        ),
      ),
    ]);

  const summaries = await resultsService.getEmployeeSummaries(
    items.map((e) => new ObjectId(e.id)),
  );

  const roleName = new Map(roles.map((r) => [r._id.toString(), r.name]));

  const designations: Option[] = roles.map((r) => ({
    id: r._id.toString(),
    label: `${r.name} (${r.code})`,
  }));
  const jobFamilies: Option[] = families.map((f) => ({
    id: f._id.toString(),
    label: f.name,
  }));
  const qs = (role?: string) => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (division) p.set("division", division);
    if (designation) p.set("designation", designation.toString());
    if (role && role !== "all") p.set("role", role);
    const s = p.toString();
    return s ? `/employees?${s}` : "/employees";
  };
  const tabs: TabLink[] = CATEGORIES.map((c, i) => ({
    id: c.id,
    label: `${c.label} (${counts[i] ?? 0})`,
    href: qs(c.id),
  }));

  // Headcount stats (unfiltered — describe the whole active directory).
  const totalActive = counts[0] ?? 0;
  const divisionCount = new Set(
    allUsers.map((u) => u.division).filter(Boolean),
  ).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            People Directory
          </h1>
          <p className="text-sm text-text-secondary">
            Manage people, reporting lines, and designations, and open each
            person&apos;s competency dashboard.
          </p>
        </div>
        <Link
          href="/roles"
          className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken"
        >
          <Layers className="h-4 w-4" /> Designations &amp; Roles
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="People"
          value={totalActive}
          icon={Users}
          hint="active in the directory"
        />
        <KpiCard
          label="Divisions"
          value={divisionCount}
          icon={Building2}
          hint="represented"
        />
        <KpiCard
          label="Designations"
          value={roles.length}
          icon={UserCog}
          hint="job grades in use"
        />
      </div>

      <TabLinks tabs={tabs} activeId={activeCat.id} className="overflow-x-auto" />

      {/* Org filters (native GET form — works without client JS). */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        {search && <input type="hidden" name="search" value={search} />}
        {activeCat.id !== "all" && (
          <input type="hidden" name="role" value={activeCat.id} />
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-text-tertiary">
          Division
          <select
            name="division"
            defaultValue={division ?? ""}
            className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-tertiary">
          Designation
          <select
            name="designation"
            defaultValue={designation?.toString() ?? ""}
            className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All designations</option>
            {roles.map((r) => (
              <option key={r._id.toString()} value={r._id.toString()}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-border-strong bg-surface px-4 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-sunken"
        >
          Apply
        </button>
        {(division || designation) && (
          <Link
            href={activeCat.id !== "all" ? `/employees?role=${activeCat.id}` : "/employees"}
            className="px-2 py-1.5 text-sm text-text-tertiary hover:text-primary"
          >
            Clear
          </Link>
        )}
      </form>

      <EmployeesManager
        employees={items}
        summaries={summaries}
        total={total}
        page={page}
        limit={LIMIT}
        search={search}
        activeRole={activeCat.id}
        designations={designations}
        jobFamilies={jobFamilies}
      />
    </div>
  );
}
