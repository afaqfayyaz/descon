"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { resendSelfLinkAction } from "@/lib/actions/assessment-hub.actions";

/** Re-issue + email the passwordless self link for a one-on-one assessment. */
export function ResendLinkButton({ assessmentId }: { assessmentId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function resend() {
    setState("sending");
    const res = await resendSelfLinkAction(assessmentId);
    setState(res.success ? "sent" : "error");
  }

  return (
    <button
      type="button"
      onClick={resend}
      disabled={state === "sending"}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
    >
      <Mail className="h-3.5 w-3.5" />
      {state === "sending"
        ? "Sending…"
        : state === "sent"
          ? "Link sent ✓"
          : state === "error"
            ? "Failed — retry"
            : "Resend link"}
    </button>
  );
}
