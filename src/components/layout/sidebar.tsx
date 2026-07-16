"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  Users,
  Megaphone,
  ClipboardList,
  UsersRound,
  TrendingUp,
  Settings,
  GraduationCap,
  FileText,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Optional group heading; consecutive items with the same section group. */
  section?: string;
}

const ICONS = {
  dashboard: LayoutDashboard,
  framework: Network,
  users: Users,
  campaigns: Megaphone,
  assessment: ClipboardList,
  team: UsersRound,
  executive: TrendingUp,
  settings: Settings,
  training: GraduationCap,
  reports: FileText,
  audit: ScrollText,
} satisfies Record<string, LucideIcon>;

/** The Caliber wordmark used at the top of the sidebar / mobile drawer. */
export function SidebarBrand() {
  return (
    <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-5">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
        C
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-white">
        Caliber
      </span>
    </div>
  );
}

/**
 * The grouped navigation list. Shared by the desktop sidebar and the mobile
 * drawer. `onNavigate` lets the drawer close itself when a link is tapped.
 */
export function SidebarNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  let lastSection: string | undefined;

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const showHeading = item.section && item.section !== lastSection;
        lastSection = item.section;
        return (
          <div key={item.href}>
            {showHeading && (
              <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-primary-300">
                {item.section}
              </div>
            )}
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-accent bg-primary-600 text-white"
                  : "border-transparent text-primary-200 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

/** Fixed left navigation rail (desktop only — hidden under the `lg` breakpoint). */
export function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="no-print hidden w-60 shrink-0 flex-col bg-primary-800 text-text-inverse lg:flex">
      <SidebarBrand />
      <SidebarNav items={items} />
    </aside>
  );
}
