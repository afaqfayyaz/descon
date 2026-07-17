import { requirePermission } from "@/lib/auth/permissions";
import { settingsService } from "@/lib/services/settings.service";
import { employeeService } from "@/lib/services/employee.service";
import { ThresholdsForm } from "@/components/features/settings/thresholds-form";
import { ApplicationUsers } from "@/components/features/settings/application-users";

export default async function SettingsPage() {
  const session = await requirePermission("settings.manage");
  const [thresholds, customised, appUsers] = await Promise.all([
    settingsService.getThresholds(),
    settingsService.isCustomised(),
    employeeService.list({ kind: "application" }, { page: 1, limit: 100 }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Platform access and scoring thresholds.
        </p>
      </div>

      <ApplicationUsers users={appUsers.items} currentUserId={session.user.id} />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Scoring settings
          </h2>
          <p className="text-sm text-text-secondary">
            Tune the gap traffic-light and calibration thresholds used across
            scoring and dashboards.{" "}
            {customised
              ? "Currently using custom values."
              : "Currently using defaults."}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Changes apply to new computations and live dashboards (heatmap,
          executive, results). Previously computed flags on submitted
          assessments update the next time those assessments are recomputed.
        </div>

        <ThresholdsForm initial={thresholds} />
      </section>
    </div>
  );
}
