"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ProficiencyBar } from "@/components/shared/proficiency-bar";
import { TrafficLight } from "@/components/shared/traffic-light";
import { RATING_SCALE } from "@/lib/domain/constants";
import type { TrafficLight as TL } from "@/lib/domain/constants";
import { cn } from "@/lib/utils/cn";

export interface MatrixRow {
  code: string;
  name: string;
  current: number | null;
  required: number | null;
  gap: number | null;
  trafficLight: TL | null;
  subRows?: MatrixRow[];
}

export interface ProficiencyMatrixProps {
  rows: MatrixRow[];
  levels?: readonly { level: number; label: string }[];
  expandable?: boolean;
}

function fmt(n: number | null) {
  return n === null ? "—" : n.toFixed(1);
}

function Row({
  row,
  depth,
  expandable,
}: {
  row: MatrixRow;
  depth: number;
  expandable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = expandable && !!row.subRows?.length;

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_140px_64px_56px_120px] items-center gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0",
          depth > 0 && "bg-surface-sunken/50",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: depth * 16 }}>
          {hasChildren ? (
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded p-0.5 text-text-tertiary hover:bg-border hover:text-text-primary"
              aria-label={open ? "Collapse" : "Expand"}
            >
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="inline-block w-5" />
          )}
          <span className="truncate">
            <span className="mr-1.5 text-xs font-semibold text-text-tertiary">
              {row.code}
            </span>
            <span className={cn(depth === 0 ? "font-medium text-text-primary" : "text-text-secondary")}>
              {row.name}
            </span>
          </span>
        </div>
        <ProficiencyBar
          current={row.current}
          required={row.required}
          trafficLight={row.trafficLight}
        />
        <div className="text-center tabular-nums text-text-secondary">
          {fmt(row.current)}
          <span className="mx-0.5 text-text-tertiary">/</span>
          {fmt(row.required)}
        </div>
        <div
          className={cn(
            "text-center font-semibold tabular-nums",
            row.gap === null
              ? "text-text-tertiary"
              : row.gap > 0
                ? "text-gap-critical"
                : "text-gap-strong",
          )}
        >
          {row.gap === null ? "—" : `${row.gap > 0 ? "+" : ""}${row.gap.toFixed(1)}`}
        </div>
        <div className="flex justify-end">
          {row.trafficLight && <TrafficLight status={row.trafficLight} />}
        </div>
      </div>
      {hasChildren &&
        open &&
        row.subRows!.map((sr) => (
          <Row key={sr.code} row={sr} depth={depth + 1} expandable={expandable} />
        ))}
    </>
  );
}

/**
 * PetroSkills-style "My Position" matrix: competency areas (optionally
 * expandable to sub-competencies) with a current-vs-required proficiency bar,
 * gap, and traffic-light status. Reuses ProficiencyBar + TrafficLight.
 */
export function ProficiencyMatrix({
  rows,
  levels = RATING_SCALE,
  expandable = true,
}: ProficiencyMatrixProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[minmax(0,1fr)_140px_64px_56px_120px] items-center gap-3 border-b border-border bg-surface-sunken px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
          <div>Competency</div>
          <div>Proficiency (0–5)</div>
          <div className="text-center">Cur / Req</div>
          <div className="text-center">Gap</div>
          <div className="text-right">Status</div>
        </div>
        {rows.map((r) => (
          <Row key={r.code} row={r} depth={0} expandable={expandable} />
        ))}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-surface-sunken px-4 py-2 text-[11px] text-text-tertiary">
          <span className="font-semibold uppercase tracking-wide">Scale:</span>
          {levels.map((l) => (
            <span key={l.level}>
              {l.level} {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
