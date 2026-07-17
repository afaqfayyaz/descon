"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pencil,
  Archive,
  Plus,
  Upload,
  Search,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils/cn";
import type { EmployeeListItem } from "@/lib/services/employee.service";
import type { EmployeeSummary } from "@/lib/services/results.service";
import {
  bulkImportEmployeesAction,
  createEmployeeAction,
  deactivateEmployeeAction,
  restoreEmployeeAction,
  updateEmployeeAction,
} from "@/lib/actions/employee.actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export interface Option {
  id: string;
  label: string;
}

interface Props {
  employees: EmployeeListItem[];
  summaries: Record<string, EmployeeSummary>;
  total: number;
  page: number;
  limit: number;
  search: string;
  activeRole: string;
  designations: Option[];
  jobFamilies: Option[];
  managers: Option[];
}

const STATUS_META: Record<
  EmployeeSummary["status"],
  { label: string; cls: string }
> = {
  not_assigned: { label: "Not assigned", cls: "bg-surface-sunken text-text-tertiary" },
  sent: { label: "Awaiting self", cls: "bg-accent/10 text-accent" },
  self_done: { label: "Awaiting manager", cls: "bg-warning/10 text-warning" },
  scored: { label: "Scored", cls: "bg-primary/10 text-primary" },
  finalized: { label: "Finalized", cls: "bg-gap-strong/10 text-gap-strong" },
};

const LIGHT_TEXT: Record<string, string> = {
  strong: "text-gap-strong",
  developing: "text-gap-developing",
  needs_focus: "text-gap-focus",
  critical: "text-gap-critical",
};

/**
 * Everyone in this directory is an employee. line_manager isn't picked here —
 * it's derived server-side from who reports to whom, so assigning someone as
 * another person's manager is what makes them one. Admin/executive access is a
 * different kind of account entirely (Settings → Application users).
 */
const STAFF_ROLES = ["employee"];

interface FormState {
  fullName: string;
  email: string;
  employeeCode: string;
  designation: string;
  jobFamily: string;
  division: string;
  department: string;
  lineManagerId: string;
  systemRoles: string[];
  phoneNumber: string;
  password: string;
}

function emptyForm(designations: Option[], families: Option[]): FormState {
  return {
    fullName: "",
    email: "",
    employeeCode: "",
    designation: designations[0]?.id ?? "",
    jobFamily: families[0]?.id ?? "",
    division: "",
    department: "",
    lineManagerId: "",
    systemRoles: ["employee"],
    phoneNumber: "",
    password: "",
  };
}

export function EmployeesManager({
  employees,
  summaries,
  total,
  page,
  limit,
  search,
  activeRole,
  designations,
  jobFamilies,
  managers,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<EmployeeListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(designations, jobFamilies),
  );
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(search);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<EmployeeListItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function runSearch() {
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set("search", searchInput.trim());
    if (activeRole && activeRole !== "all") params.set("role", activeRole);
    router.push(`/employees?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (activeRole && activeRole !== "all") params.set("role", activeRole);
    params.set("page", String(p));
    router.push(`/employees?${params.toString()}`);
  }

  function openCreate() {
    setForm(emptyForm(designations, jobFamilies));
    setError(null);
    setCreating(true);
  }

  function openEdit(emp: EmployeeListItem) {
    const designation =
      designations.find((d) => d.label.startsWith(emp.designationName))?.id ??
      designations[0]?.id ??
      "";
    const jobFamily =
      jobFamilies.find((f) => f.label === emp.jobFamilyName)?.id ??
      jobFamilies[0]?.id ??
      "";
    const manager = managers.find((m) => m.label.startsWith(emp.managerName ?? "\u0000"));
    setForm({
      fullName: emp.fullName,
      email: emp.email,
      employeeCode: emp.employeeCode,
      designation,
      jobFamily,
      division: emp.division,
      department: emp.department ?? "",
      lineManagerId: manager?.id ?? "",
      systemRoles: emp.systemRoles.filter((r) => r !== "system"),
      phoneNumber: "",
      password: "",
    });
    setError(null);
    setEditing(emp);
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function submit() {
    setError(null);
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      employeeCode: form.employeeCode.trim(),
      designation: form.designation,
      jobFamily: form.jobFamily,
      division: form.division.trim(),
      department: form.department.trim() || null,
      lineManagerId: form.lineManagerId || null,
      // line_manager is derived server-side from reporting lines, so it's never
      // sent from here; update() preserves whatever the last sync decided.
      systemRoles: STAFF_ROLES,
      phoneNumber: form.phoneNumber.trim() || null,
      ...(form.password.trim() ? { password: form.password.trim() } : {}),
    };
    startTransition(async () => {
      const res = editing
        ? await updateEmployeeAction(editing.id, payload)
        : await createEmployeeAction(payload);
      if (res.success) close();
      else setError(res.error);
    });
  }

  function deactivate(emp: EmployeeListItem) {
    setActionError(null);
    setConfirming(emp);
  }

  function confirmDeactivate() {
    const emp = confirming;
    if (!emp) return;
    startTransition(async () => {
      const res = await deactivateEmployeeAction(emp.id);
      if (!res.success) setActionError(res.error);
      else router.refresh();
      setConfirming(null);
    });
  }

  function restore(emp: EmployeeListItem) {
    setActionError(null);
    startTransition(async () => {
      const res = await restoreEmployeeAction(emp.id);
      if (!res.success) setActionError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <p className="rounded-md bg-gap-critical/10 px-3 py-2 text-sm text-gap-critical">
          {actionError}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search name, email, code…"
              className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:w-72"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={runSearch}>
            Search
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImporting(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add employee
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th scope="col" className="px-5 py-3 font-medium">Employee</th>
              <th scope="col" className="px-3 py-3 font-medium">Code</th>
              <th scope="col" className="px-3 py-3 font-medium">Designation</th>
              <th scope="col" className="px-3 py-3 font-medium">Division</th>
              <th scope="col" className="px-3 py-3 font-medium">Manager</th>
              <th scope="col" className="px-3 py-3 font-medium">Capability</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                  No employees found.
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{e.fullName}</div>
                    <div className="text-xs text-slate-400">{e.email}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-500">{e.employeeCode}</td>
                  <td className="px-3 py-3 text-slate-600">{e.designationName}</td>
                  <td className="px-3 py-3 text-slate-600">{e.division}</td>
                  <td className="px-3 py-3 text-slate-600">
                    {e.managerName ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {(() => {
                      const s = summaries[e.id];
                      if (!s)
                        return <span className="text-slate-400">—</span>;
                      const meta = STATUS_META[s.status];
                      return (
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                              meta.cls,
                            )}
                          >
                            {meta.label}
                          </span>
                          {s.capabilityPercent !== null && (
                            <span className="text-xs text-text-secondary">
                              <span className="font-semibold tabular-nums text-text-primary">
                                {s.capabilityPercent}%
                              </span>{" "}
                              cap ·{" "}
                              <span
                                className={cn(
                                  "font-semibold tabular-nums",
                                  s.trafficLight
                                    ? LIGHT_TEXT[s.trafficLight]
                                    : "text-text-tertiary",
                                )}
                              >
                                gap {s.gap !== null && s.gap > 0 ? "+" : ""}
                                {s.gap ?? "—"}
                              </span>
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/employees/${e.id}`}
                        className="rounded p-1.5 text-slate-400 hover:bg-accent/10 hover:text-accent"
                        aria-label="View dashboard"
                        title="View dashboard"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!e.isActive ? (
                        <button
                          type="button"
                          onClick={() => restore(e)}
                          className="rounded px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10"
                        >
                          Restore
                        </button>
                      ) : (
                      <button
                        type="button"
                        onClick={() => deactivate(e)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Deactivate"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} employees</span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={creating || editing !== null}
        title={editing ? "Edit employee" : "New employee"}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input
                className={inputCls}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
            <Field label="Employee code">
              <input
                className={inputCls}
                value={form.employeeCode}
                onChange={(e) =>
                  setForm({ ...form, employeeCode: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Email">
            <input
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Designation">
              <select
                className={inputCls}
                value={form.designation}
                onChange={(e) =>
                  setForm({ ...form, designation: e.target.value })
                }
              >
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Job family">
              <select
                className={inputCls}
                value={form.jobFamily}
                onChange={(e) => setForm({ ...form, jobFamily: e.target.value })}
              >
                {jobFamilies.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Division">
              <input
                className={inputCls}
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value })}
              />
            </Field>
            <Field label="Department (optional)">
              <input
                className={inputCls}
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Line manager (optional)">
            <select
              className={inputCls}
              value={form.lineManagerId}
              onChange={(e) =>
                setForm({ ...form, lineManagerId: e.target.value })
              }
            >
              <option value="">— None —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Phone (optional)">
              <input
                className={inputCls}
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
              />
            </Field>
            <Field
              label={editing ? "Reset password (optional)" : "Password (optional)"}
            >
              <input
                type="password"
                className={inputCls}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
          </div>
          {error && (
            <p className="rounded-md bg-gap-critical/10 px-3 py-2 text-sm text-gap-critical">
              {error}
            </p>
          )}
        </div>
      </Modal>

      <BulkImportModal open={importing} onClose={() => setImporting(false)} />

      <ConfirmDialog
        open={confirming !== null}
        title={`Deactivate ${confirming?.fullName ?? ""}?`}
        body="They'll be removed from the directory, but their past assessments are kept. You can bring them back any time from the Deactivated tab."
        confirmLabel="Deactivate"
        destructive
        busy={pending}
        onConfirm={confirmDeactivate}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

function BulkImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setResult(null);
    const rows = parseCsv(csv);
    if (rows.length === 0) {
      setResult("No valid rows detected.");
      return;
    }
    startTransition(async () => {
      const res = await bulkImportEmployeesAction({ rows });
      if (res.success) {
        const errs = res.errors.length
          ? ` ${res.errors.length} error(s): ${res.errors.slice(0, 3).join("; ")}`
          : "";
        setResult(
          `Created ${res.created}, updated ${res.updated}.${errs}`,
        );
      } else {
        setResult(res.error);
      }
    });
  }

  return (
    <Modal
      open={open}
      title="Bulk import employees"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={pending}>
            Close
          </Button>
          <Button size="sm" onClick={run} disabled={pending}>
            {pending ? "Importing…" : "Import"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Paste CSV with header row. Columns:
        </p>
        <code className="block rounded bg-slate-100 p-2 text-xs text-slate-600">
          fullName,email,employeeCode,designationCode,jobFamilyCode,division,department,managerEmployeeCode,systemRoles
        </code>
        <p className="text-xs text-slate-500">
          Separate multiple system roles with a semicolon (e.g.{" "}
          <code>employee;line_manager</code>). Designation and job family are
          matched by their codes.
        </p>
        <textarea
          className={`${inputCls} font-mono`}
          rows={8}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="fullName,email,employeeCode,designationCode,jobFamilyCode,division,department,managerEmployeeCode,systemRoles"
        />
        {result && (
          <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {result}
          </p>
        )}
      </div>
    </Modal>
  );
}

interface ParsedRow {
  fullName: string;
  email: string;
  employeeCode: string;
  designationCode: string;
  jobFamilyCode: string;
  division: string;
  department: string | null;
  managerEmployeeCode: string | null;
  systemRoles: string[];
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i]!.split(",").map((s) => s.trim());
    if (c.length < 6) continue;
    rows.push({
      fullName: c[0] ?? "",
      email: c[1] ?? "",
      employeeCode: c[2] ?? "",
      designationCode: c[3] ?? "",
      jobFamilyCode: c[4] ?? "",
      division: c[5] ?? "",
      department: c[6] || null,
      managerEmployeeCode: c[7] || null,
      systemRoles: (c[8] || "employee")
        .split(";")
        .map((r) => r.trim())
        .filter(Boolean),
    });
  }
  return rows;
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
