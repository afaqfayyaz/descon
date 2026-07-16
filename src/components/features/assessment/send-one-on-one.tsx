"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { assignAssessmentAction } from "@/lib/actions/assessment-hub.actions";
import {
  listCandidatesAction,
  getScopeTreeAction,
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

/**
 * "Send one-on-one" — assign the questionnaire directly to a single employee
 * from the Assessments hub. Pick the employee, optionally narrow the scope,
 * and the employee receives a passwordless link by email.
 */
export function SendOneOnOne({ jobFamilies }: { jobFamilies: JobFamilyOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [jobFamilyId, setJobFamilyId] = useState(jobFamilies[0]?.id ?? "");
  const [candidates, setCandidates] = useState<CandidateEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("");

  const [scopeTree, setScopeTree] = useState<ScopeArea[]>([]);
  const [scope, setScope] = useState<ScopeValue>({
    mode: "full",
    questionIds: new Set(),
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load candidates + scope tree whenever the job family changes.
  useEffect(() => {
    if (!open || !jobFamilyId) return;
    let active = true;
    void (async () => {
      const [cRes, sRes] = await Promise.all([
        listCandidatesAction(jobFamilyId),
        getScopeTreeAction(jobFamilyId),
      ]);
      if (!active) return;
      if (cRes.success) {
        setCandidates(cRes.employees);
        setEmployeeId("");
      }
      if (sRes.success) {
        setScopeTree(sRes.areas);
        setScope((p) => ({ ...p, questionIds: new Set() }));
      }
    })();
    return () => {
      active = false;
    };
  }, [open, jobFamilyId]);

  const questionCount = useMemo(
    () =>
      scope.mode === "full"
        ? allQuestionIdsOf(scopeTree).length
        : scope.questionIds.size,
    [scope, scopeTree],
  );

  async function submit() {
    setError(null);
    if (!employeeId) {
      setError("Select an employee to send the assessment to.");
      return;
    }
    if (scope.mode === "custom" && scope.questionIds.size === 0) {
      setError("Select at least one question, or switch to the full framework.");
      return;
    }
    setSubmitting(true);
    const res = await assignAssessmentAction(employeeId, {
      mode: scope.mode,
      questionIds: scope.mode === "custom" ? [...scope.questionIds] : [],
    });
    setSubmitting(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setOpen(false);
    setEmployeeId("");
    setScope({ mode: "full", questionIds: new Set() });
    router.refresh();
  }

  const inputCls =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Send className="mr-1.5 h-4 w-4" />
        Send one-on-one
      </Button>

      <Modal
        open={open}
        title="Send one-on-one assessment"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              {questionCount} question{questionCount === 1 ? "" : "s"} in test
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting || !employeeId}>
                {submitting ? "Sending…" : "Send assessment"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            The employee receives a secure passwordless link by email and their
            manager is asked to rate them once they submit.
          </p>

          {jobFamilies.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Job family
              </label>
              <select
                className={inputCls}
                value={jobFamilyId}
                onChange={(e) => setJobFamilyId(e.target.value)}
              >
                {jobFamilies.map((jf) => (
                  <option key={jf.id} value={jf.id}>
                    {jf.name} ({jf.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Employee
            </label>
            <select
              className={inputCls}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Select an employee…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} — {c.designation}
                  {c.division ? ` · ${c.division}` : ""}
                </option>
              ))}
            </select>
          </div>

          <ScopePicker
            tree={scopeTree}
            value={scope}
            onChange={setScope}
            title="Questionnaire scope"
          />

          {error && (
            <p className="rounded-md bg-gap-critical/10 px-3 py-2 text-sm text-gap-critical">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
