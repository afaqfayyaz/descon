import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Responsive dashboard grid. Children control their own column span via
 * Tailwind classes, e.g. className="lg:col-span-2" / "xl:col-span-3".
 */
export function WidgetGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
