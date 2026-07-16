"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  updateThresholdsAction,
  resetThresholdsAction,
  type ThresholdsFormValues,
} from "@/lib/actions/settings.actions";

const inputCls =
  "mt-1 w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function ThresholdsForm({
  initial,
}: {
  initial: ThresholdsFormValues;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ThresholdsFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function setGap(key: keyof ThresholdsFormValues["gap"], value: string) {
    setForm((p) => ({ ...p, gap: { ...p.gap, [key]: Number(value) } }));
    setSaved(false);
  }
  function setCal(key: keyof ThresholdsFormValues["calibration"], value: string) {
    setForm((p) => ({
      ...p,
      calibration: { ...p.calibration, [key]: Number(value) },
    }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateThresholdsAction(form);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function reset() {
    setBusy(true);
    setError(null);
    const res = await resetThresholdsAction();
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Gap traffic-light thresholds
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Keyed on the gap (required − manager level). A gap at or below each
          maximum gets that status; anything above the last is critical.
        </p>
        <div className="mt-4 flex flex-wrap gap-6">
          <label className="text-sm text-slate-700">
            Strong (≤)
            <input
              type="number"
              step="0.1"
              value={form.gap.strongMax}
              onChange={(e) => setGap("strongMax", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="text-sm text-slate-700">
            Developing (≤)
            <input
              type="number"
              step="0.1"
              value={form.gap.developingMax}
              onChange={(e) => setGap("developingMax", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="text-sm text-slate-700">
            Needs focus (≤)
            <input
              type="number"
              step="0.1"
              value={form.gap.needsFocusMax}
              onChange={(e) => setGap("needsFocusMax", e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Calibration thresholds
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Keyed on |self − manager|. At or below aligned is no flag; at or below
          minor is a minor outlier; above is a major outlier.
        </p>
        <div className="mt-4 flex flex-wrap gap-6">
          <label className="text-sm text-slate-700">
            Aligned (≤)
            <input
              type="number"
              step="0.1"
              value={form.calibration.alignedMax}
              onChange={(e) => setCal("alignedMax", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="text-sm text-slate-700">
            Minor outlier (≤)
            <input
              type="number"
              step="0.1"
              value={form.calibration.minorMax}
              onChange={(e) => setCal("minorMax", e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
      </section>

      {error && (
        <p className="rounded-md bg-gap-critical/10 px-3 py-2 text-sm text-gap-critical">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-md bg-gap-strong/10 px-3 py-2 text-sm text-gap-strong">
          Thresholds saved. New computations and live dashboards use these
          values.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save thresholds"}
        </Button>
        <Button variant="ghost" onClick={reset} disabled={busy}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
