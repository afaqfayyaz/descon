"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface RoleOption {
  role: string;
  label: string;
  href: string;
}

/**
 * Shows the active role. If the user holds more than one role, becomes a
 * dropdown that navigates to each role's home (route groups gate the content).
 */
export function RoleSwitcher({
  roles,
  activeRole,
}: {
  roles: RoleOption[];
  activeRole: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = roles.find((r) => r.role === activeRole) ?? roles[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!active) return null;

  if (roles.length <= 1) {
    return (
      <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-text-secondary">
        {active.label}
      </span>
    );
  }

  return (
    <div className="relative no-print" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-border"
      >
        {active.label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-raised">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            Switch view
          </div>
          {roles.map((r) => (
            <Link
              key={r.role}
              href={r.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between px-3 py-2 text-sm hover:bg-surface-sunken",
                r.role === activeRole
                  ? "font-medium text-text-primary"
                  : "text-text-secondary",
              )}
            >
              {r.label}
              {r.role === activeRole && <Check className="h-4 w-4 text-accent" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
