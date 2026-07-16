"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Archive, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  archiveAreaAction,
  createAreaAction,
  updateAreaAction,
} from "@/lib/actions/framework.actions";

export interface AreaRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sequence: number;
  weight: number;
  subCount: number;
}

interface Props {
  jobFamilyId: string;
  areas: AreaRow[];
}

interface FormState {
  name: string;
  code: string;
  description: string;
  sequence: string;
  weight: string;
}

const EMPTY: FormState = {
  name: "",
  code: "",
  description: "",
  sequence: "",
  weight: "1",
};

export function AreasManager({ jobFamilyId, areas }: Props) {
  const [editing, setEditing] = useState<AreaRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setForm({ ...EMPTY, sequence: String(areas.length + 1) });
    setError(null);
    setCreating(true);
  }

  function openEdit(area: AreaRow) {
    setForm({
      name: area.name,
      code: area.code,
      description: area.description ?? "",
      sequence: String(area.sequence),
      weight: String(area.weight),
    });
    setError(null);
    setEditing(area);
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function submit() {
    setError(null);
    const payload = {
      jobFamilyId,
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      sequence: Number(form.sequence),
      weight: Number(form.weight),
    };
    startTransition(async () => {
      const res = editing
        ? await updateAreaAction(editing.id, payload)
        : await createAreaAction(payload);
      if (res.success) close();
      else setError(res.error);
    });
  }

  function archive(area: AreaRow) {
    if (!confirm(`Archive "${area.name}"? Historical data is preserved.`)) return;
    startTransition(async () => {
      const res = await archiveAreaAction(area.id);
      if (!res.success) alert(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" /> Add area
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">Seq</th>
              <th className="px-3 py-3 font-medium">Code</th>
              <th className="px-3 py-3 font-medium">Area</th>
              <th className="px-3 py-3 text-center font-medium">Weight</th>
              <th className="px-3 py-3 text-center font-medium">Sub-comps</th>
              <th className="px-3 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  No areas yet. Add your first competency area.
                </td>
              </tr>
            ) : (
              areas.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3 text-slate-500">{a.sequence}</td>
                  <td className="px-3 py-3 font-medium text-slate-500">{a.code}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/framework/areas/${a.id}`}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {a.name}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center text-slate-600">
                    {a.weight}
                  </td>
                  <td className="px-3 py-3 text-center text-slate-600">
                    {a.subCount}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archive(a)}
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
        title={editing ? "Edit area" : "New competency area"}
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
          <div className="grid grid-cols-3 gap-3">
            <Field label="Code">
              <input
                className={inputCls}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </Field>
            <Field label="Sequence">
              <input
                type="number"
                className={inputCls}
                value={form.sequence}
                onChange={(e) => setForm({ ...form, sequence: e.target.value })}
              />
            </Field>
            <Field label="Weight">
              <input
                type="number"
                step="0.1"
                className={inputCls}
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
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
