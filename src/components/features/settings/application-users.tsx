"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createApplicationUserAction,
  deactivateApplicationUserAction,
} from "@/lib/actions/employee.actions";
import type { EmployeeListItem } from "@/lib/services/employee.service";

/** Access levels grantable here. super_admin is intentionally not offered. */
const ACCESS_LEVELS = [
  {
    id: "hr_admin",
    label: "HR Admin",
    hint: "Full access: people, framework, campaigns, settings.",
  },
  {
    id: "executive",
    label: "Executive",
    hint: "Read-only dashboards and org-wide reports.",
  },
] as const;

const ROLE_LABELS: Record<string, string> = {
  hr_admin: "HR Admin",
  executive: "Executive",
  system: "System",
};

const ROLE_STYLES: Record<string, string> = {
  hr_admin: "bg-primary-light text-primary",
  executive: "bg-accent-50 text-accent-700",
  system: "bg-slate-100 text-slate-600",
};

interface FormState {
  fullName: string;
  email: string;
  password: string;
  systemRoles: string[];
}

const EMPTY: FormState = {
  fullName: "",
  email: "",
  password: "",
  systemRoles: ["hr_admin"],
};

/**
 * Manage the accounts that administer the platform. Distinct from the People
 * Directory, which holds the staff being assessed. The super admin is filtered
 * out at the repository level and never reaches this component.
 */
export function ApplicationUsers({
  users,
  currentUserId,
}: {
  users: EmployeeListItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function toggleRole(role: string) {
    setForm((p) => ({
      ...p,
      systemRoles: p.systemRoles.includes(role)
        ? p.systemRoles.filter((r) => r !== role)
        : [...p.systemRoles, role],
    }));
  }

  async function submit() {
    setError(null);
    setSaving(true);
    const res = await createApplicationUserAction(form);
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setOpen(false);
    setForm(EMPTY);
    router.refresh();
  }

  const [revoking, setRevoking] = useState<{ id: string; name: string } | null>(
    null,
  );

  async function confirmRevoke() {
    if (!revoking) return;
    setBusyId(revoking.id);
    const res = await deactivateApplicationUserAction(revoking.id);
    setBusyId(null);
    setRevoking(null);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Application users
          </h2>
          <p className="text-sm text-text-secondary">
            Accounts that administer Caliber. These are separate from the People
            Directory — application users aren&apos;t assessed and don&apos;t
            appear in campaigns.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add application user
        </Button>
      </div>

      {error && !open && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        {users.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-secondary">
            No application users yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-tertiary">
                <th className="px-5 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Access</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0 hover:bg-surface-sunken"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      </span>
                      <span>
                        <span className="block font-medium text-text-primary">
                          {u.fullName}
                          {u.id === currentUserId && (
                            <span className="ml-1.5 text-xs font-normal text-text-tertiary">
                              (you)
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-text-tertiary">
                          {u.email}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      {u.systemRoles.map((r) => (
                        <span
                          key={r}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ROLE_STYLES[r] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ROLE_LABELS[r] ?? r}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`text-xs font-medium ${
                        u.isActive ? "text-gap-strong" : "text-text-tertiary"
                      }`}
                    >
                      {u.isActive ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {u.isActive && u.id !== currentUserId && (
                      <button
                        onClick={() =>
                          setRevoking({ id: u.id, name: u.fullName })
                        }
                        disabled={busyId === u.id}
                        className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                      >
                        {busyId === u.id ? "Revoking…" : "Revoke access"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={open}
        title="Add application user"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Creating…" : "Create user"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <p className="text-sm text-text-secondary">
            This account administers the platform. It won&apos;t be assessed or
            appear in the People Directory.
          </p>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-primary">
              Full name
            </span>
            <input
              value={form.fullName}
              onChange={(e) =>
                setForm((p) => ({ ...p, fullName: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-border px-3 text-sm"
              placeholder="Jane Doe"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-primary">
              Email
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-border px-3 text-sm"
              placeholder="jane@caliber.app"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text-primary">
              Temporary password
            </span>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-border px-3 text-sm"
              placeholder="At least 8 characters"
            />
            <span className="mt-1 block text-xs text-text-tertiary">
              Share this with them directly; they can sign in with it right
              away.
            </span>
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-text-primary">
              Access level
            </span>
            <div className="space-y-2">
              {ACCESS_LEVELS.map((lvl) => (
                <label
                  key={lvl.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                    form.systemRoles.includes(lvl.id)
                      ? "border-primary bg-primary-light"
                      : "border-border hover:bg-surface-sunken"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.systemRoles.includes(lvl.id)}
                    onChange={() => toggleRole(lvl.id)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="block font-medium text-text-primary">
                      {lvl.label}
                    </span>
                    <span className="block text-xs text-text-secondary">
                      {lvl.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={revoking !== null}
        title={`Revoke access for ${revoking?.name ?? ""}?`}
        body="They won't be able to sign in to Caliber any more. This doesn't touch any assessment data."
        confirmLabel="Revoke access"
        destructive
        busy={busyId !== null}
        onConfirm={confirmRevoke}
        onCancel={() => setRevoking(null)}
      />
    </section>
  );
}
