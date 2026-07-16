import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/permissions";
import { frameworkService } from "@/lib/services/framework.service";
import {
  RolesManager,
  type RoleRow,
} from "@/components/features/employees/roles-manager";

export default async function RolesPage() {
  await requirePermission("framework.view");
  const roles = await frameworkService.listRoles();

  const rows: RoleRow[] = roles.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    code: r.code,
    level: r.level,
    description: r.description,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/employees"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to People
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Designations &amp; Roles</h1>
        <p className="text-sm text-slate-500">
          Job grades assigned to employees — each determines the required
          competency levels for the people holding it.
        </p>
      </div>
      <RolesManager roles={rows} />
    </div>
  );
}
