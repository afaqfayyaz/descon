"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RATING_SCALE } from "@/lib/domain/constants";
import { adjustRatingAction } from "@/lib/actions/calibration.actions";
import type { OutlierRow as OutlierRowData } from "@/lib/services/analytics.service";

const FLAG_STYLES: Record<string, string> = {
  major_outlier: "bg-gap-critical/10 text-gap-critical",
  minor_outlier: "bg-gap-developing/10 text-gap-developing",
};

export function OutlierRow({
  campaignId,
  subCompetencyId,
  row,
  editable,
}: {
  campaignId: string;
  subCompetencyId: string;
  row: OutlierRowData;
  editable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<number>(row.managerLevel ?? 3);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await adjustRatingAction(
      campaignId,
      row.assessmentId,
      subCompetencyId,
      level,
      note || null,
    );
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50">
        <td className="px-4 py-2">
          <div className="font-medium text-slate-800">{row.employeeName}</div>
          <div className="text-xs text-slate-500">{row.division}</div>
        </td>
        <td className="px-3 py-2 text-slate-700">
          <span className="text-xs font-semibold text-slate-400">
            {row.subCode}
          </span>{" "}
          {row.subName}
          {row.note && (
            <div className="text-xs italic text-slate-400">“{row.note}”</div>
          )}
        </td>
        <td className="px-3 py-2 text-center text-slate-600">
          {row.selfLevel ?? "—"}
        </td>
        <td className="px-3 py-2 text-center text-slate-600">
          {row.managerLevel ?? "—"}
        </td>
        <td className="px-3 py-2 text-center font-semibold text-slate-800">
          {row.difference !== null
            ? `${row.difference > 0 ? "+" : ""}${row.difference}`
            : "—"}
        </td>
        <td className="px-3 py-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              FLAG_STYLES[row.flag] ?? "bg-slate-100 text-slate-500"
            }`}
          >
            {row.flag.replace("_", " ")}
          </span>
        </td>
        <td className="px-3 py-2 text-right">
          {editable ? (
            <button
              onClick={() => setOpen((o) => !o)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {open ? "Close" : "Adjust"}
            </button>
          ) : (
            <Link
              href={`/results/${row.assessmentId}`}
              className="text-sm text-primary hover:underline"
            >
              Open →
            </Link>
          )}
        </td>
      </tr>
      {open && editable && (
        <tr className="bg-slate-50">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Calibrated manager level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {RATING_SCALE.map((s) => (
                    <option key={s.level} value={s.level}>
                      {s.level} — {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[14rem]">
                <label className="block text-xs font-medium text-slate-500">
                  Calibration note (optional)
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Rationale agreed in the workshop"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Button onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Apply adjustment"}
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-gap-critical">{error}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
