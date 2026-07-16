"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  moveToCalibrationAction,
  lockCampaignAction,
} from "@/lib/actions/campaign.actions";

export function CampaignStateActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);

  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Failed");
      return;
    }
    setConfirmLock(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "active" && (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => run(() => moveToCalibrationAction(campaignId))}
        >
          {busy ? "Working…" : "Move to calibration"}
        </Button>
      )}

      {status === "in_calibration" &&
        (confirmLock ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              Lock &amp; finalize all results?
            </span>
            <Button variant="secondary" onClick={() => setConfirmLock(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() => run(() => lockCampaignAction(campaignId))}
            >
              {busy ? "Locking…" : "Confirm lock"}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setConfirmLock(true)}>Lock campaign</Button>
        ))}

      {status === "locked" && (
        <span className="rounded-full bg-gap-strong/10 px-3 py-1 text-xs font-medium text-gap-strong">
          Locked &amp; finalized
        </span>
      )}

      {error && <span className="text-xs text-gap-critical">{error}</span>}
    </div>
  );
}
