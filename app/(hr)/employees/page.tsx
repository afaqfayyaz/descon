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
const CATEGORIES: { id: string; label: string; role?: SystemRole }[] = [
  { id: "all", label: "All" },
  { id: "employee", label: "Employees", role: "employee" },
  { id: "line_manager", label: "Line Managers", role: "line_manager" },
];

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: { search?: string; page?: string; role?: string };
}) {
  await requirePermission("user.manage");

  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const search = searchParams.search?.trim() ?? "";
  const activeCat =
    CATEGORIES.find((c) => c.id === searchParams.role) ?? CATEGORIES[0]!;
  const baseFilter = {
    search: search || undefined,
    role: activeCat.role,
    kind: "staff" as const,
  };

  const [{ items, total }, roles, families, allUsers, counts] =
    await Promise.all([
      employeeService.list(baseFilter, { page, limit: LIMIT }),
      roleRepo.findAll(),
      jobFamilyRepo.findAll(),
      userRepo.findMany({ kind: "staff" }, { page: 1, limit: 500 }),
      Promise.all(
        CATEGORIES.map((c) =>
          userRepo.count({
            search: search || undefined,
            role: c.role,
            kind: "staff",
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
  // Only people who actually hold the line-manager role can be picked as a manager.
  const managers: Option[] = allUsers
    .filter((u) => u.systemRoles.includes("line_manager"))
    .map((u) => ({
      id: u._id.toString(),
      label: `${u.fullName} · ${roleName.get(u.designation.toString()) ?? "—"} · ${u.division}`,
    }));

  const qs = (role?: string) => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
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
        managers={managers}
      />
    </div>
  );
}
