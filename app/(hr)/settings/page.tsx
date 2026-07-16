import { requirePermission } from "@/lib/auth/permissions";
import { settingsService } from "@/lib/services/settings.service";
import { ThresholdsForm } from "@/components/features/settings/thresholds-form";

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const [thresholds, customised] = await Promise.all([
    settingsService.getThresholds(),
    settingsService.isCustomised(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scoring settings</h1>
        <p className="text-sm text-slate-500">
          Tune the gap traffic-light and calibration thresholds used across
          scoring and dashboards.{" "}
          {customised ? "Currently using custom values." : "Currently using defaults."}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Changes apply to new computations and live dashboards (heatmap,
        executive, results). Previously computed flags on submitted assessments
        update the next time those assessments are recomputed.
      </div>

      <ThresholdsForm initial={thresholds} />
    </div>
  );
}
