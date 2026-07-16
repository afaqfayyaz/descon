import { CheckCircle2 } from "lucide-react";

export default function TokenDonePage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="rounded-lg border border-border bg-surface p-8 shadow-card">
        <CheckCircle2 className="mx-auto h-12 w-12 text-gap-strong" />
        <h1 className="mt-4 text-xl font-semibold text-text-primary">
          Submitted — thank you
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Your responses have been recorded. You can close this window. There is
          nothing further to do.
        </p>
      </div>
    </div>
  );
}
