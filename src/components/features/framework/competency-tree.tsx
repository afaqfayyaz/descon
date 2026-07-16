"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";
import type {
  FrameworkAreaNode,
  FrameworkRoleColumn,
} from "@/lib/services/framework.service";

export function CompetencyTree({
  areas,
  roles,
}: {
  areas: FrameworkAreaNode[];
  roles: FrameworkRoleColumn[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(areas.map((a) => [a.id, false])),
  );

  function toggle(id: string) {
    setOpen((p) => ({ ...p, [id]: !p[id] }));
  }

  if (areas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-text-tertiary">
        No competency areas yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-border bg-surface">
      {areas.map((area) => {
        const isOpen = open[area.id];
        return (
          <div key={area.id}>
            <button
              type="button"
              onClick={() => toggle(area.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-text-tertiary" />
              ) : (
                <ChevronRight className="h-4 w-4 text-text-tertiary" />
              )}
              <span className="text-xs font-semibold text-text-tertiary">
                {area.code}
              </span>
              <span className="font-medium text-text-primary">{area.name}</span>
              <span className="ml-auto text-xs text-text-tertiary">
                {area.subCompetencies.length} sub-competencies
              </span>
            </button>

            {isOpen && (
              <div className="bg-slate-50/60 px-4 pb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-text-tertiary">
                      <th className="py-2 pr-3 font-medium">Sub-competency</th>
                      <th className="px-2 py-2 text-center font-medium">Qs</th>
                      {roles.map((r) => (
                        <th
                          key={r.id}
                          className="px-2 py-2 text-center font-medium"
                          title={r.name}
                        >
                          {r.code}
                        </th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {area.subCompetencies.map((sub) => (
                      <tr key={sub.id}>
                        <td className="py-2 pr-3">
                          <span className="text-xs font-semibold text-text-tertiary">
                            {sub.code}
                          </span>{" "}
                          <span className="text-text-primary">{sub.name}</span>
                        </td>
                        <td className="px-2 py-2 text-center text-text-secondary">
                          {sub.questionCount}
                        </td>
                        {roles.map((r) => {
                          const lvl = sub.requiredByRole[r.id];
                          return (
                            <td key={r.id} className="px-2 py-2 text-center">
                              {lvl === null || lvl === undefined ? (
                                <span className="text-text-tertiary">—</span>
                              ) : (
                                <span className="inline-block rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                                  L{lvl}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 text-right">
                          <Link
                            href={`/framework/sub-competencies/${sub.id}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Questions →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
