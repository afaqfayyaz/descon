"use client";

import { useState, useTransition } from "react";
import { Pencil, Archive, Plus, UserPlus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { TrainingView } from "@/lib/services/training.service";
import {
  archiveTrainingAction,
  assignTrainingAction,
  createTrainingAction,
  setAssignmentStatusAction,
  updateTrainingAction,
} from "@/lib/actions/training.actions";

export interface Option {
  id: string;
  label: string;
}

interface Props {
  trainings: TrainingView[];
  subCompetencies: Option[];
  employees: Option[];
}

const TYPES = [
  "course",
  "certification",
  "workshop",
  "mentoring",
  "stretch_assignment",
  "other",
] as const;

const STATUSES = ["assigned", "in_progress", "completed", "cancelled"] as const;

interface FormState {
  name: string;
  description: string;
  type: string;
  durationHours: string;
  provider: string;
  url: string;
  subs: string[];
}

const EMPTY: FormState = {
  name: "",
  description: "",
  type: "course",
  durationHours: "",
  provider: "",
  url: "",
  subs: [],
};

export function TrainingsManager({
  trainings,
  subCompetencies,
  employees,
}: Props) {
  const [editing, setEditing] = useState<TrainingView | null>(null);
  const [creating, setCreating] = useState(false);
  const [assignFor, setAssignFor] = useState<TrainingView | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setForm(EMPTY);
    setError(null);
    setCreating(true);
  }

  function openEdit(t: TrainingView) {
    setForm({
      name: t.name,
      description: t.description ?? "",
      type: t.type,
      durationHours: String(t.durationHours ?? ""),
      provider: t.provider ?? "",
      url: t.url ?? "",
      subs: t.addressesSubCompetencies,
    });
    setError(null);
    setEditing(t);
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function toggleSub(id: string) {
    setForm((prev) => ({
      ...prev,
      subs: prev.subs.includes(id)
        ? prev.subs.filter((s) => s !== id)
        : [...prev.subs, id],
    }));
  }

  function submit() {
    setError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      durationHours: form.durationHours ? Number(form.durationHours) : null,
      provider: form.provider.trim() || null,
      url: form.url.trim() || null,
      addressesSubCompetencies: form.subs,
    };
    startTransition(async () => {
      const res = editing
        ? await updateTrainingAction(editing.id, payload)
        : await createTrainingAction(payload);
      if (res.success) close();
      else setError(res.error);
    });
  }

  function archive(t: TrainingView) {
    if (!confirm(`Archive "${t.name}"?`)) return;
    startTransition(async () => {
      const res = await archiveTrainingAction(t.id);
      if (!res.success) alert(res.error);
    });
  }

  function changeStatus(
    trainingId: string,
    employeeId: string,
    assignedAt: string,
    status: string,
  ) {
    startTransition(async () => {
      const res = await setAssignmentStatusAction({
        trainingId,
        employeeId,
        assignedAt,
        status,
      });
      if (!res.success) alert(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" /> Add training
        </Button>
      </div>

      <div className="grid gap-4">
        {trainings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
            No trainings in the catalog yet.
          </div>
        ) : (
          trainings.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{t.name}</h3>
                    <span className="rounded bg-primary-light px-1.5 py-0.5 text-xs font-medium text-primary">
                      {t.type.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {[t.provider, t.durationHours ? `${t.durationHours}h` : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {t.description && (
                    <p className="mt-1 text-sm text-slate-600">{t.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {t.url && (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Open link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setAssignFor(t)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary"
                    aria-label="Assign"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => archive(t)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Archive"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {t.addressesLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.addressesLabels.map((l) => (
                    <span
                      key={l}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              )}

              {t.assignments.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Assignments
                  </p>
                  <ul className="space-y-1.5">
                    {t.assignments.map((a) => (
                      <li
                        key={`${a.employeeId}-${a.assignedAt}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-700">{a.employeeName}</span>
                        <div className="flex items-center gap-2">
                          {a.dueDate && (
                            <span className="text-xs text-slate-400">
                              due {new Date(a.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <select
                            value={a.status}
                            onChange={(e) =>
                              changeStatus(
                                t.id,
                                a.employeeId,
                                a.assignedAt,
                                e.target.value,
                              )
                            }
                            disabled={pending}
                            className="rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-primary"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal
        open={creating || editing !== null}
        title={editing ? "Edit training" : "New training"}
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
            <Field label="Type">
              <select
                className={inputCls}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {ty.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duration (h)">
              <input
                type="number"
                className={inputCls}
                value={form.durationHours}
                onChange={(e) =>
                  setForm({ ...form, durationHours: e.target.value })
                }
              />
            </Field>
            <Field label="Provider">
              <input
                className={inputCls}
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              />
            </Field>
          </div>
          <Field label="URL (optional)">
            <input
              className={inputCls}
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              className={inputCls}
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <Field label="Addresses sub-competencies">
            <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-slate-200 p-2">
              {subCompetencies.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.subs.includes(s.id)}
                    onChange={() => toggleSub(s.id)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </Field>
          {error && (
            <p className="rounded-md bg-gap-critical/10 px-3 py-2 text-sm text-gap-critical">
              {error}
            </p>
          )}
        </div>
      </Modal>

      <AssignModal
        training={assignFor}
        employees={employees}
        onClose={() => setAssignFor(null)}
      />
    </div>
  );
}

function AssignModal({
  training,
  employees,
  onClose,
}: {
  training: TrainingView | null;
  employees: Option[];
  onClose: () => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!training) return;
    setError(null);
    if (!employeeId) {
      setError("Select an employee");
      return;
    }
    startTransition(async () => {
      const res = await assignTrainingAction({
        trainingId: training.id,
        employeeId,
        dueDate: dueDate || null,
        notes: notes.trim() || null,
      });
      if (res.success) {
        setEmployeeId("");
        setDueDate("");
        setNotes("");
        onClose();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Modal
      open={training !== null}
      title={training ? `Assign: ${training.name}` : "Assign"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? "Assigning…" : "Assign"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Employee">
          <select
            className={inputCls}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">— Select —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date (optional)">
          <input
            type="date"
            className={inputCls}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
        <Field label="Notes (optional)">
          <textarea
            className={inputCls}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        {error && (
          <p className="rounded-md bg-gap-critical/10 px-3 py-2 text-sm text-gap-critical">
            {error}
          </p>
        )}
      </div>
    </Modal>
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
