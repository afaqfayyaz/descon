"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createCampaignAction,
  listCandidatesAction,
  getScopeTreeAction,
  type CampaignFormValues,
  type CandidateEmployee,
} from "@/lib/actions/campaign.actions";
import type { ScopeArea } from "@/lib/services/framework.service";
import {
  ScopePicker,
  allQuestionIdsOf,
  type ScopeValue,
} from "@/components/features/campaigns/scope-picker";

interface JobFamilyOption {
  id: string;
  name: string;
  code: string;
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export function CampaignBuilder({
  jobFamilies,
  divisions,
}: {
  jobFamilies: JobFamilyOption[];
  divisions: string[];
}) {
  const router = useRouter();

  const [form, setForm] = useState<
    Omit<CampaignFormValues, "participantIds" | "scope">
  >({
    name: "",
    description: "",
    jobFamilyId: jobFamilies[0]?.id ?? "",
    divisions: [],
    startDate: isoDate(0),
    selfAssessmentDeadline: isoDate(14),
    managerAssessmentDeadline: isoDate(28),
    calibrationDeadline: isoDate(42),
  });

  // Recipients
  const [candidates, setCandidates] = useState<CandidateEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(
    new Set(),
  );
  const [search, setSearch] = useState("");
  const [divFilter, setDivFilter] = useState<string[]>([]);

  // Scope
  const [scopeTree, setScopeTree] = useState<ScopeArea[]>([]);
  const [scope, setScope] = useState<ScopeValue>({
    mode: "full",
    questionIds: new Set(),
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load candidates + scope tree whenever the job family changes.
  useEffect(() => {
    if (!form.jobFamilyId) return;
    let active = true;
    void (async () => {
      const [cRes, sRes] = await Promise.all([
        listCandidatesAction(form.jobFamilyId),
        getScopeTreeAction(form.jobFamilyId),
      ]);
      if (!active) return;
      if (cRes.success) {
        setCandidates(cRes.employees);
        setSelectedEmployees(new Set());
      }
      if (sRes.success) {
        setScopeTree(sRes.areas);
        setScope((p) => ({ ...p, questionIds: new Set() }));
      }
    })();
    return () => {
      active = false;
    };
  }, [form.jobFamilyId]);

  const allQuestionIds = useMemo(() => allQuestionIdsOf(scopeTree), [scopeTree]);

  const visibleCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (divFilter.length > 0 && !divFilter.includes(c.division)) return false;
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.division.toLowerCase().includes(q)
      );
    });
  }, [candidates, search, divFilter]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function toggleDivFilter(div: string) {
    setDivFilter((p) =>
      p.includes(div) ? p.filter((d) => d !== div) : [...p, div],
    );
  }

  function toggleEmployee(id: string) {
    setSelectedEmployees((p) => {
      const next = new Set(p);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedEmployees((p) => {
      const next = new Set(p);
      const allSelected = visibleCandidates.every((c) => next.has(c.id));
      for (const c of visibleCandidates) {
        if (allSelected) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selectedEmployees.size === 0) {
      setError("Select at least one employee to send the test to.");
      return;
    }
    if (scope.mode === "custom" && scope.questionIds.size === 0) {
      setError("Select at least one question, or switch to the full framework.");
      return;
    }
    setSubmitting(true);
    const payload: CampaignFormValues = {
      ...form,
      participantIds: [...selectedEmployees],
      scope: {
        mode: scope.mode,
        questionIds: scope.mode === "custom" ? [...scope.questionIds] : [],
      },
    };
    const res = await createCampaignAction(payload);
    setSubmitting(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.push(`/campaigns/${res.campaignId}`);
  }

  const labelCls = "block text-sm font-medium text-slate-700";
  const inputCls =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
  const scopeCount =
    scope.mode === "full" ? allQuestionIds.length : scope.questionIds.size;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {/* Details */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Campaign name</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Annual Review 2026"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Description (optional)</label>
              <textarea
                className={inputCls}
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Job family</label>
              <select
                className={inputCls}
                value={form.jobFamilyId}
                onChange={(e) => set("jobFamilyId", e.target.value)}
              >
                {jobFamilies.map((jf) => (
                  <option key={jf.id} value={jf.id}>
                    {jf.name} ({jf.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recipients
            </h2>
            <button
              type="button"
              onClick={selectAllVisible}
              className="text-xs text-primary hover:underline"
            >
              {visibleCandidates.length > 0 &&
              visibleCandidates.every((c) => selectedEmployees.has(c.id))
                ? "Clear all"
                : "Select all shown"}
            </button>
          </div>

          {divisions.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {divisions.map((div) => {
                const active = divFilter.includes(div);
                return (
                  <button
                    type="button"
                    key={div}
                    onClick={() => toggleDivFilter(div)}
                    className={`rounded-full border px-3 py-0.5 text-xs transition-colors ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {div}
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className={`${inputCls} mt-0 pl-8`}
              placeholder="Search employees by name, email, division…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
            {visibleCandidates.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">
                No employees match. Adjust filters or add employees first.
              </p>
            ) : (
              visibleCandidates.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.has(c.id)}
                    onChange={() => toggleEmployee(c.id)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="flex-1 font-medium text-slate-700">
                    {c.fullName}
                  </span>
                  <span className="text-xs text-slate-400">{c.designation}</span>
                  <span className="w-20 truncate text-right text-xs text-slate-400">
                    {c.division}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Test scope */}
        <ScopePicker tree={scopeTree} value={scope} onChange={setScope} />

        {/* Timeline */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Timeline
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Start date</label>
              <input
                type="date"
                className={inputCls}
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Self-assessment deadline</label>
              <input
                type="date"
                className={inputCls}
                value={form.selfAssessmentDeadline}
                onChange={(e) => set("selfAssessmentDeadline", e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Manager deadline</label>
              <input
                type="date"
                className={inputCls}
                value={form.managerAssessmentDeadline}
                onChange={(e) =>
                  set("managerAssessmentDeadline", e.target.value)
                }
                required
              />
            </div>
            <div>
              <label className={labelCls}>Calibration deadline</label>
              <input
                type="date"
                className={inputCls}
                value={form.calibrationDeadline}
                onChange={(e) => set("calibrationDeadline", e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-gap-critical/10 px-3 py-2 text-sm text-gap-critical">
            {error}
          </p>
        )}
      </div>

      <aside className="space-y-4">
        <div className="sticky top-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Summary
            </h2>
            <div className="mt-3 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">
                  {selectedEmployees.size}
                </span>
                <span className="text-sm text-slate-500">
                  employee{selectedEmployees.size === 1 ? "" : "s"} selected
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-700">
                  {scopeCount}
                </span>
                <span className="text-sm text-slate-500">
                  questions in test
                </span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || selectedEmployees.size === 0}
          >
            {submitting ? "Creating…" : "Create draft campaign"}
          </Button>
          <p className="text-center text-xs text-slate-400">
            Review and launch it on the next screen.
          </p>
        </div>
      </aside>
    </form>
  );
}
