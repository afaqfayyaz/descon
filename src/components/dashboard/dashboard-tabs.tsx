"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

/** Controlled, client-state tab bar (for client dashboards). */
export function DashboardTabs({
  tabs,
  value,
  onValueChange,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onValueChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-border", className)}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onValueChange(t.id)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-accent text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export interface TabLink extends TabItem {
  href: string;
}

/** Link-based tab bar (works inside server components via URL params). */
export function TabLinks({
  tabs,
  activeId,
  className,
}: {
  tabs: TabLink[];
  activeId: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-border", className)}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = t.id === activeId;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-accent text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
