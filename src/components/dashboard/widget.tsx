"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface WidgetProps {
  title: string;
  subtitle?: string;
  info?: string;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  className?: string;
  /** Body padding; disable for tables/charts that manage their own padding. */
  noPadding?: boolean;
  children: ReactNode;
}

/** PetroSkills-style dashboard widget: title strip + collapsible body. */
export function Widget({
  title,
  subtitle,
  info,
  actions,
  collapsible = true,
  defaultCollapsed = false,
  loading = false,
  empty = false,
  emptyText = "No data yet.",
  className,
  noPadding = false,
  children,
}: WidgetProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface-sunken px-5 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {title}
          </h3>
          {info && (
            <span className="group relative inline-flex">
              <Info className="h-3.5 w-3.5 text-text-tertiary" />
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-primary-900 px-2 py-1 text-[11px] text-white group-hover:block">
                {info}
              </span>
            </span>
          )}
          {subtitle && (
            <span className="truncate text-xs text-text-tertiary">· {subtitle}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {collapsible && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="rounded p-1 text-text-tertiary hover:bg-border hover:text-text-primary"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </header>
      {!collapsed && (
        <div className={cn("flex-1", !noPadding && "p-5")}>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-text-tertiary">
              Loading…
            </div>
          ) : empty ? (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-sm text-text-tertiary">
              {emptyText}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  );
}
