"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { resendManagerLinkAction } from "@/lib/actions/assessment-hub.actions";

export interface RaterOption {
  id: string;
  fullName: string;
  designation: string;
  division: string | null;
}

/**
 * Send a submitted one-on-one to a rater for scoring. Opens a picker so HR can
 * choose who rates it at send time (defaulting to the assessment's current line
 * manager) rather than being locked to whoever was assigned when it was created.
 */
export function SendManagerLinkButton({
  assessmentId,
  raters,
  currentRaterId,
  label = "Send to manager",
}: {
  assessmentId: string;
  raters: RaterOption[];
  currentRaterId: string | null;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [raterId, setRaterId] = useState(currentRaterId ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    if (!raterId) {
      setError("Select who should rate this assessment.");
      return;
    }
    setSending(true);
    const res = await resendManagerLinkAction(assessmentId, raterId);
    setSending(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setSent(true);
    setOpen(false);
    router.refresh();
  }

  const selected = raters.find((r) => r.id === raterId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Mail className="h-3.5 w-3.5" />
        {sent ? "Sent to manager ✓" : label}
      </button>

      <Modal
        open={open}
        title="Send for manager rating"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={send} disabled={sending || !raterId}>
              {sending ? "Sending…" : "Send rating link"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            The rater receives a secure passwordless link by email and scores
            each sub-competency. Choosing someone new reassigns this assessment
            to them — it does not change the employee&apos;s line manager.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Rated by
            </label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={raterId}
              onChange={(e) => setRaterId(e.target.value)}
            >
              <option value="">Select a rater…</option>
              {raters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName} — {r.designation}
                  {r.division ? ` · ${r.division}` : ""}
                </option>
              ))}
            </select>
            {selected && currentRaterId && selected.id !== currentRaterId && (
              <p className="mt-2 text-xs text-gap-developing">
                This reassigns the rating from the current line manager to{" "}
                {selected.fullName}.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-md bg-gap-critical/10 px-3 py-2 text-sm text-gap-critical">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
