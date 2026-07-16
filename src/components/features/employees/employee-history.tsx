"use client";

import Link from "next/link";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import type { EmployeeHistoryEntry } from "@/lib/services/results.service";

const TL_STYLES: Record<string, string> = {
  strong: "bg-gap-strong/10 text-gap-strong",
  developing: "bg-gap-developing/10 text-gap-developing",
  needs_focus: "bg-gap-focus/10 text-gap-focus",
  critical: "bg-gap-critical/10 text-gap-critical",
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function EmployeeHistory({ entries }: { entries: EmployeeHistoryEntry[] }) {
  const scored = entries.filter((e) => e.managerLevel !== null);

  const trendData = scored.map((e) => ({
    date: shortDate(e.date),
    self: e.selfLevel ?? 0,
    manager: e.managerLevel ?? 0,
    required: e.requiredLevel ?? 0,
  }));

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Assessment history
      </h2>

      {scored.length >= 2 && (
        <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">
            Level trend over time
          </h3>
          <TrendLineChart
            data={trendData}
            xKey="date"
            domain={[0, 5]}
            series={[
              { key: "self", label: "Self", color: "#94a3b8" },
              { key: "manager", label: "Manager", color: "#0a84ff" },
              { key: "required", label: "Required", color: "#f59e0b" },
            ]}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-tertiary">
              <th className="px-5 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Campaign</th>
              <th className="px-3 py-2 text-center font-medium">Self</th>
              <th className="px-3 py-2 text-center font-medium">Manager</th>
              <th className="px-3 py-2 text-center font-medium">Required</th>
              <th className="px-3 py-2 text-center font-medium">Gap</th>
              <th className="px-3 py-2 text-center font-medium">Capability</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.assessmentId}
                className="border-b border-border last:border-0 hover:bg-surface-sunken"
              >
                <td className="px-5 py-2 text-text-secondary">
                  {shortDate(e.date)}
                </td>
                <td className="px-3 py-2 text-text-primary">{e.campaignName}</td>
                <td className="px-3 py-2 text-center">{e.selfLevel ?? "—"}</td>
                <td className="px-3 py-2 text-center">{e.managerLevel ?? "—"}</td>
                <td className="px-3 py-2 text-center">{e.requiredLevel ?? "—"}</td>
                <td className="px-3 py-2 text-center font-medium">
                  {e.gap === null ? "—" : `${e.gap > 0 ? "+" : ""}${e.gap}`}
                </td>
                <td className="px-3 py-2 text-center">
                  {e.capabilityPercent === null ? "—" : `${e.capabilityPercent}%`}
                </td>
                <td className="px-3 py-2">
                  {e.trafficLight ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        TL_STYLES[e.trafficLight] ?? TL_STYLES.developing
                      }`}
                    >
                      {e.trafficLight.replace("_", " ")}
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">
                      {e.status.replace("_", " ")}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {e.managerLevel !== null && (
                    <Link
                      href={`/results/${e.assessmentId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
