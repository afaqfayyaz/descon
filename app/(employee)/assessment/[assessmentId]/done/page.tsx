import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireSession } from "@/lib/auth/session";

export default async function AssessmentDonePage() {
  const session = await requireSession();
  const firstName = (session.user.name ?? "there").split(/\s+/)[0];

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gap-strong/15 text-gap-strong">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary">
        Submitted Successfully
      </h1>
      <p className="text-text-secondary">
        Thank you, {firstName}! Your manager will be in touch once both sides
        complete.
      </p>
      <Link
        href="/assessment"
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
      >
        Return Home
      </Link>
    </div>
  );
}
