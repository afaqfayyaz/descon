import Link from "next/link";
import { SearchX } from "lucide-react";

/** Global 404 — friendly, on-brand. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-card">
        <SearchX className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-4 text-lg font-semibold text-text-primary">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
