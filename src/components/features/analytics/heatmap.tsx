import type { CampaignHeatmap, HeatmapCell } from "@/lib/services/analytics.service";

const CELL_STYLES: Record<string, string> = {
  strong: "bg-gap-strong/15 text-gap-strong",
  developing: "bg-gap-developing/15 text-gap-developing",
  needs_focus: "bg-gap-focus/15 text-gap-focus",
  critical: "bg-gap-critical/15 text-gap-critical",
};

function Cell({
  cell,
  className = "",
}: {
  cell: HeatmapCell | null;
  className?: string;
}) {
  if (!cell) {
    return (
      <td
        className={`border border-slate-100 px-3 py-2 text-center text-slate-300 ${className}`}
      >
        —
      </td>
    );
  }
  const sign = cell.avgGap > 0 ? "+" : "";
  return (
    <td className={`border border-slate-100 p-1 ${className}`}>
      <div
        className={`rounded-md px-2 py-1.5 text-center ${
          CELL_STYLES[cell.trafficLight] ?? ""
        }`}
        title={`Avg manager level ${cell.avgManager} · ${cell.count} ratings`}
      >
        <div className="text-sm font-bold">
          {sign}
          {cell.avgGap}
        </div>
        <div className="text-[10px] opacity-70">L{cell.avgManager}</div>
      </div>
    </td>
  );
}

const LEGEND = [
  { label: "On track (gap ≤ 0)", cls: "bg-gap-strong" },
  { label: "Developing (≤ 1)", cls: "bg-gap-developing" },
  { label: "Needs focus (≤ 2)", cls: "bg-gap-focus" },
  { label: "Critical (> 2)", cls: "bg-gap-critical" },
];

export function Heatmap({ data }: { data: CampaignHeatmap }) {
  if (!data.resultsAvailable) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        No computed results yet. The heatmap fills in once participants&apos;
        self and manager assessments are both submitted.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Competency area</th>
              <th className="border-l border-slate-200 px-3 py-3 text-center font-semibold">
                Overall
              </th>
              {data.divisions.map((div) => (
                <th key={div} className="px-3 py-3 text-center font-medium">
                  {div}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.areaCode}>
                <td className="px-4 py-2">
                  <span className="text-xs font-semibold text-slate-400">
                    {row.areaCode}
                  </span>{" "}
                  <span className="font-medium text-slate-800">
                    {row.areaName}
                  </span>
                </td>
                <Cell cell={row.overall} className="border-l-2 border-l-slate-200" />
                {data.divisions.map((div) => (
                  <Cell key={div} cell={row.cells[div] ?? null} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="font-medium">Avg gap (required − manager):</span>
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-sm ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
