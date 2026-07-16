"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { extendDeadlineAction } from "@/lib/actions/campaign.actions";

export function ExtendDeadline({
  campaignId,
  selfDeadline,
  managerDeadline,
}: {
  campaignId: string;
  selfDeadline: string; // yyyy-mm-dd
  managerDeadline: string; // yyyy-mm-dd
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [self, setSelf] = useState(selfDeadline);
  const [mgr, setMgr] = useState(managerDeadline);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await extendDeadlineAction(campaignId, self, mgr);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <CalendarClock className="h-4 w-4" />
        Extend deadline
      </button>

      <Modal
        open={open}
        title="Extend campaign deadlines"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save deadlines"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Self-assessment deadline
            </span>
            <input
              type="date"
              value={self}
              onChange={(e) => setSelf(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Manager rating deadline
            </span>
            <input
              type="date"
              value={mgr}
              onChange={(e) => setMgr(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          {error && <p className="text-sm text-gap-critical">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
