"use client";

import { useState, useTransition } from "react";
import { Pencil, Archive, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  archiveRoleAction,
  createRoleAction,
  updateRoleAction,
} from "@/lib/actions/framework.actions";

export interface RoleRow {
  id: string;
  name: string;
  code: string;
  level: number;
  description: string | null;
}

interface FormState {
  name: string;
  code: string;
  level: string;
  description: string;
}

const EMPTY: FormState = { name: "", code: "", level: "1", description: "" };

export function RolesManager({ roles }: { roles: RoleRow[] }) {
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setForm(EMPTY);
    setError(null);
    setCreating(true);
  }

  function openEdit(role: RoleRow) {
    setForm({
      name: role.name,
      code: role.code,
      level: String(role.level),
      description: role.description ?? "",
    });
    setError(null);
    setEditing(role);
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function submit() {
    setError(null);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      level: Number(form.level),
      description: form.description.trim() || null,
    };
    startTransition(async () => {
      const res = editing
        ? await updateRoleAction(editing.id, payload)
        : await createRoleAction(payload);
      if (res.success) close();
      else setError(res.error);
    });
  }

  function archive(role: RoleRow) {
    if (!confirm(`Archive role "${role.name}"?`)) return;
    startTransition(async () => {
      const res = await archiveRoleAction(role.id);
      if (!res.success) alert(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" /> Add role
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">Level</th>
              <th className="px-3 py-3 font-medium">Code</th>
              <th className="px-3 py-3 font-medium">Designation</th>
              <th className="px-3 py-3 font-medium">Description</th>
              <th className="px-3 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  No designations yet.
                </td>
              </tr>
            ) : (
              roles.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3 text-slate-500">{r.level}</td>
                  <td className="px-3 py-3 font-medium text-slate-500">{r.code}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-3 py-3 text-slate-500">
                    {r.description ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archive(r)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={creating || editing !== null}
        title={editing ? "Edit designation" : "New designation"}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code">
              <input
                className={inputCls}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </Field>
            <Field label="Level (1–20)">
              <input
                type="number"
                className={inputCls}
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Description (optional)">
            <textarea
              className={inputCls}
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          {error && (
            <p className="rounded-md bg-gap-critical/10 px-3 py-2 text-sm text-gap-critical">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
