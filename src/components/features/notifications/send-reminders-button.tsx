"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { runRemindersAction } from "@/lib/actions/notification.actions";

export function SendRemindersButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const res = await runRemindersAction();
      setMessage(
        res.success
          ? res.created === 0
            ? "No new reminders due."
            : `Sent ${res.created} reminder(s).`
          : res.error,
      );
    });
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-sm text-slate-500">{message}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <BellRing className="h-4 w-4" />
        {pending ? "Sending…" : "Send reminders"}
      </button>
    </div>
  );
}
