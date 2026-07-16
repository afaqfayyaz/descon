"use client";

import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
