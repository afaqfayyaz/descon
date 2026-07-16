"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/utils/logger";

/** Global error boundary — shown when a route throws an unhandled error. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error({ digest: error.digest }, "route error boundary");
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-card">
        <AlertTriangle className="mx-auto h-10 w-10 text-gap-developing" />
        <h1 className="mt-4 text-lg font-semibold text-text-primary">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          An unexpected error occurred. You can try again, and if it keeps
          happening, contact your administrator.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
