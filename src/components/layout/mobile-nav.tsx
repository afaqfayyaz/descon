"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarBrand, SidebarNav, type NavItem } from "@/components/layout/sidebar";

/**
 * Mobile navigation: a hamburger (shown under `lg`) that opens an overlay
 * drawer reusing the same grouped nav list as the desktop sidebar.
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-sunken"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex w-64 max-w-[80%] flex-col bg-primary-800 text-text-inverse shadow-raised">
            <div className="flex items-center justify-between pr-2">
              <SidebarBrand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-primary-200 hover:bg-white/10 hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav items={items} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
