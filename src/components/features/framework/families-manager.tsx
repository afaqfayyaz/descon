"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Archive, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils/cn";
import {
  archiveJobFamilyAction,
  createJobFamilyAction,
  updateJobFamilyAction,
} from "@/lib/actions/framework.actions";

export interface FamilyRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  areaCount: number;
}

interface FormState {
  name: string;
  code: string;
  description: string;
}

const EMPTY: FormState = { name: "", code: "", description: "" };

export function FamiliesManager({
  families,
  selectedId,
}: {
  families: FamilyRow[];
  selectedId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<FamilyRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setForm(EMPTY);
    setError(null);
    setCreating(true);
  }
  function openEdit(f: FamilyRow) {
    setForm({ name: f.name, code: f.code, description: f.description ?? "" });
    setError(null);
    setEditing(f);
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
      description: form.description.trim() || null,
    };
    startTransition(async () => {
      const res = editing
        ? await updateJobFamilyAction(editing.id, payload)
        : await createJobFamilyAction(payload);
      if (res.success) {
        close();
        router.refresh();
      } else setError(res.error);
    });
  }

  function archive(f: FamilyRow) {
    if (!confirm(`Archive "${f.name}"? Historical data is preserved.`)) return;
    startTransition(async () => {
      const res = await archiveJobFamilyAction(f.id);
      if (res.success) router.refresh();
      else alert(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Job families
        </h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" /> Add family
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {families.map((f) => {
          const active = f.id === selectedId;
          return (
            <div
              key={f.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                active
                  ? "border-accent bg-accent/5"
                  : "border-border bg-surface",
              )}
            >
              <button
                onClick={() => router.push(`/framework?family=${f.id}`)}
                className="flex items-center gap-2"
              >
                {active && <Check className="h-4 w-4 text-accent" />}
                <span className="font-medium text-text-primary">{f.name}</span>
                <span className="text-xs text-text-tertiary">
                  {f.code} · {f.areaCount} areas
                </span>
              </button>
              <button
                type="button"
                onClick={() => openEdit(f)}
                className="rounded p-1 text-text-tertiary hover:bg-surface-sunken hover:text-text-primary"
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => archive(f)}
                className="rounded p-1 text-text-tertiary hover:bg-red-50 hover:text-red-600"
                aria-label="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <Modal
        open={creating || editing !== null}
        title={editing ? "Edit job family" : "New job family"}
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
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Name</span>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Code</span>
            <input
              className={inputCls}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Description (optional)
            </span>
            <textarea
              className={inputCls}
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
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
