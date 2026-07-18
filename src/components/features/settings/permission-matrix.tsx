import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import { hasPermission } from "@/lib/auth/permissions";
import type { SystemRole } from "@/lib/domain/constants";

/**
 * Human-readable index of what each access level can do. Access is computed
 * through the same hasPermission used to enforce it, so this table can never
 * drift from real behaviour — only the labels are curated here.
 */
const GROUPS: { group: string; rows: { key: string; label: string }[] }[] = [
  {
    group: "People & assessments",
    rows: [
      { key: "user.manage", label: "Manage the People Directory" },
      { key: "campaign.create", label: "Create & launch campaigns" },
      { key: "assessment.manager.rate", label: "Rate on a manager's behalf" },
      { key: "assessment.view.all", label: "View all assessment results" },
    ],
  },
  {
    group: "Framework",
    rows: [
      { key: "framework.view", label: "View the competency framework" },
      { key: "framework.area.create", label: "Edit competencies & questions" },
      { key: "framework.requiredLevel.update", label: "Set required levels" },
    ],
  },
  {
    group: "Insights",
    rows: [
      { key: "report.org", label: "Org-wide reports & executive view" },
      { key: "report.export", label: "Export reports (PDF / Excel)" },
      { key: "audit.view", label: "Read the audit log" },
    ],
  },
  {
    group: "Administration",
    rows: [
      { key: "settings.manage", label: "Manage settings & application users" },
      { key: "training.manage", label: "Manage trainings" },
      { key: "notification.send", label: "Send reminders" },
    ],
  },
];

const LEVELS: { role: SystemRole; label: string }[] = [
  { role: "hr_admin", label: "HR Admin" },
  { role: "executive", label: "Executive" },
];

export function PermissionMatrix() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          What each access level can do
        </h2>
        <p className="text-sm text-text-secondary">
          Computed from the live permission rules — this table always matches
          what the app actually enforces.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-tertiary">
              <th className="px-5 py-2 font-medium">Capability</th>
              {LEVELS.map((l) => (
                <th key={l.role} className="px-3 py-2 text-center font-medium">
                  {l.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <Fragment key={g.group}>
                <tr className="border-b border-border bg-surface-sunken">
                  <td
                    colSpan={1 + LEVELS.length}
                    className="px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary"
                  >
                    {g.group}
                  </td>
                </tr>
                {g.rows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-5 py-2 text-text-primary">{row.label}</td>
                    {LEVELS.map((l) => (
                      <td key={l.role} className="px-3 py-2 text-center">
                        {hasPermission([l.role], row.key) ? (
                          <Check className="mx-auto h-4 w-4 text-gap-strong" />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-border-strong" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
