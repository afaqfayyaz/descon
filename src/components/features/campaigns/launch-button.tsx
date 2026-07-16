"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { launchCampaignAction } from "@/lib/actions/campaign.actions";

export function LaunchButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function launch() {
    setBusy(true);
    setError(null);
    const res = await launchCampaignAction(campaignId);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">
            Launch and notify participants?
          </span>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button onClick={launch} disabled={busy}>
            {busy ? "Launching…" : "Confirm launch"}
          </Button>
        </div>
      ) : (
        <Button onClick={() => setConfirming(true)}>Launch campaign</Button>
      )}
      {error && <span className="text-xs text-gap-critical">{error}</span>}
    </div>
  );
}
