"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/**
 * Styled replacement for window.confirm(). Controlled: the caller owns the
 * open state and supplies the consequence copy — a confirm should say what
 * will actually happen, not just ask "are you sure?".
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Styles the confirm button red for irreversible/removing actions. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy}
            variant={destructive ? "danger" : "primary"}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{body}</p>
    </Modal>
  );
}
