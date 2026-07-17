import { ShieldCheck } from "lucide-react";
import type { EmployeeListItem } from "@/lib/services/employee.service";

const ROLE_LABELS: Record<string, string> = {
  hr_admin: "HR Admin",
  executive: "Executive",
  system: "System",
};

const ROLE_STYLES: Record<string, string> = {
  hr_admin: "bg-primary-light text-primary",
  executive: "bg-accent-50 text-accent-700",
  system: "bg-slate-100 text-slate-600",
};

/**
 * Read-only list of the accounts that administer the platform. Distinct from
 * the People Directory, which holds the staff being assessed. The super admin
 * is filtered out at the repository level and never reaches this component.
 */
export function ApplicationUsers({ users }: { users: EmployeeListItem[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Application users
        </h2>
        <p className="text-sm text-text-secondary">
          Accounts that administer Caliber. These are separate from the People
          Directory — application users aren&apos;t assessed and don&apos;t
          appear in campaigns.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        {users.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-secondary">
            No application users yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-tertiary">
                <th className="px-5 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Access</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0 hover:bg-surface-sunken"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      </span>
                      <span>
                        <span className="block font-medium text-text-primary">
                          {u.fullName}
                        </span>
                        <span className="block text-xs text-text-tertiary">
                          {u.email}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      {u.systemRoles.map((r) => (
                        <span
                          key={r}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ROLE_STYLES[r] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ROLE_LABELS[r] ?? r}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`text-xs font-medium ${
                        u.isActive ? "text-gap-strong" : "text-text-tertiary"
                      }`}
                    >
                      {u.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-text-tertiary">
        Application users are provisioned out-of-band with{" "}
        <code className="rounded bg-surface-sunken px-1 py-0.5">
          npm run create-admin
        </code>
        .
      </p>
    </section>
  );
}
