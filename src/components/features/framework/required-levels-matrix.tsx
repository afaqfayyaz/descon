"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveRequiredLevelsAction } from "@/lib/actions/framework.actions";

export interface MatrixRole {
  id: string;
  name: string;
  code: string;
}

export interface MatrixRow {
  subId: string;
  subCode: string;
  subName: string;
  areaCode: string;
  areaName: string;
  values: Record<string, number | null>;
}

interface Props {
  roles: MatrixRole[];
  rows: MatrixRow[];
}

type Edits = Record<string, Record<string, number | null>>;

export function RequiredLevelsMatrix({ roles, rows }: Props) {
  const [edits, setEdits] = useState<Edits>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function valueOf(row: MatrixRow, roleId: string): number | null {
    const edited = edits[row.subId]?.[roleId];
    if (edited !== undefined) return edited;
    return row.values[roleId] ?? null;
  }

  function setValue(subId: string, roleId: string, value: number | null) {
    setEdits((prev) => ({
      ...prev,
      [subId]: { ...(prev[subId] ?? {}), [roleId]: value },
    }));
    setMessage(null);
  }

  const dirtyCount = Object.values(edits).reduce(
    (sum, byRole) => sum + Object.keys(byRole).length,
    0,
  );

  function save() {
    const cells: Array<{
      subCompetencyId: string;
      roleId: string;
      requiredLevel: number;
    }> = [];
    for (const row of rows) {
      for (const role of roles) {
        const v = valueOf(row, role.id);
        if (v !== null && v >= 1 && v <= 5) {
          cells.push({
            subCompetencyId: row.subId,
            roleId: role.id,
            requiredLevel: v,
          });
        }
      }
    }
    startTransition(async () => {
      const res = await saveRequiredLevelsAction({ cells });
      if (res.success) {
        setEdits({});
        setMessage(`Saved. ${res.changed} cell(s) updated.`);
      } else {
        setMessage(res.error);
      }
    });
  }

  let lastArea = "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Set the required level (1–5) for each sub-competency by designation.
        </p>
        <div className="flex items-center gap-3">
          {message && <span className="text-sm text-slate-500">{message}</span>}
          <Button onClick={save} size="sm" disabled={pending || dirtyCount === 0}>
            {pending ? "Saving…" : `Save${dirtyCount ? ` (${dirtyCount})` : ""}`}
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-medium">
                Sub-Competency
              </th>
              {roles.map((r) => (
                <th key={r.id} className="px-2 py-3 text-center font-medium">
                  {r.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const showArea = row.areaCode !== lastArea;
              lastArea = row.areaCode;
              return (
                <RowGroup
                  key={row.subId}
                  row={row}
                  roles={roles}
                  showArea={showArea}
                  valueOf={valueOf}
                  setValue={setValue}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowGroup({
  row,
  roles,
  showArea,
  valueOf,
  setValue,
}: {
  row: MatrixRow;
  roles: MatrixRole[];
  showArea: boolean;
  valueOf: (row: MatrixRow, roleId: string) => number | null;
  setValue: (subId: string, roleId: string, value: number | null) => void;
}) {
  return (
    <>
      {showArea && (
        <tr className="bg-slate-100/70">
          <td
            colSpan={roles.length + 1}
            className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {row.areaCode}. {row.areaName}
          </td>
        </tr>
      )}
      <tr className="border-b border-slate-100 last:border-0">
        <td className="sticky left-0 z-10 bg-white px-4 py-2">
          <span className="font-medium text-slate-400">{row.subCode}</span>{" "}
          <span className="text-slate-700">{row.subName}</span>
        </td>
        {roles.map((role) => {
          const v = valueOf(row, role.id);
          return (
            <td key={role.id} className="px-2 py-2 text-center">
              <select
                value={v ?? ""}
                onChange={(e) =>
                  setValue(
                    row.subId,
                    role.id,
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                className="w-14 rounded border border-slate-300 px-1 py-1 text-center text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </td>
          );
        })}
      </tr>
    </>
  );
}
