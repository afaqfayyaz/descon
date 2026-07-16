"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  saveAnswerAction,
  submitSelfAction,
} from "@/lib/actions/self-assessment.actions";
import type { SelfQuestionnaire } from "@/lib/services/questionnaire.service";

type Phase = "intro" | "answer" | "review";

type SaveResult = { success: boolean; progress?: number; error?: string };

export function Questionnaire({
  data,
  saveAnswer,
  submitAssessment,
  doneHref,
  exitHref = "/assessment",
}: {
  data: SelfQuestionnaire;
  /** Override the save action (token flow). Defaults to the session action. */
  saveAnswer?: (
    questionId: string,
    version: number,
    option: string,
  ) => Promise<SaveResult>;
  /** Override the submit action (token flow). */
  submitAssessment?: () => Promise<SaveResult>;
  doneHref?: string;
  exitHref?: string;
}) {
  const router = useRouter();
  const readOnly = data.status === "submitted";
  const doSaveAnswer =
    saveAnswer ??
    ((questionId: string, version: number, option: string) =>
      saveAnswerAction(data.assessmentId, questionId, version, option));
  const doSubmit =
    submitAssessment ?? (() => submitSelfAction(data.assessmentId));

  const initialAnswers = useMemo(() => {
    const m: Record<string, string> = {};
    for (const area of data.areas)
      for (const sub of area.subs)
        for (const q of sub.questions) if (q.selected) m[q.id] = q.selected;
    return m;
  }, [data]);

  // Flat, sequenced list of all questions (PRD numbers them 1..135).
  const flatQuestions = useMemo(() => {
    const list: {
      n: number;
      id: string;
      version: number;
      text: string;
      areaCode: string;
      areaName: string;
      options: { letter: string; text: string }[];
    }[] = [];
    let n = 0;
    for (const area of data.areas)
      for (const sub of area.subs)
        for (const q of sub.questions) {
          n += 1;
          list.push({
            n,
            id: q.id,
            version: q.version,
            text: q.text,
            areaCode: area.code,
            areaName: area.name,
            options: q.options,
          });
        }
    return list;
  }, [data]);

  const optionText = useMemo(() => {
    const m: Record<string, Record<string, string>> = {};
    for (const q of flatQuestions) {
      const byLetter: Record<string, string> = {};
      for (const o of q.options) byLetter[o.letter] = o.text;
      m[q.id] = byLetter;
    }
    return m;
  }, [flatQuestions]);

  const [phase, setPhase] = useState<Phase>(readOnly ? "answer" : "intro");
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [progress, setProgress] = useState(data.progress);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const complete = answeredCount >= data.totalQuestions;

  function choose(q: { id: string; version: number }, option: string) {
    if (readOnly) return;
    setAnswers((prev) => ({ ...prev, [q.id]: option }));
    startTransition(async () => {
      const res = await doSaveAnswer(q.id, q.version, option);
      if (!res.success) setError(res.error ?? "Something went wrong");
      else if (res.progress !== undefined) setProgress(res.progress);
    });
  }

  function editFromReview(id: string) {
    setPhase("answer");
    setTimeout(() => {
      document
        .getElementById(`q-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await doSubmit();
    setSubmitting(false);
    setConfirmOpen(false);
    if (!res.success) {
      setError(res.error ?? "Something went wrong");
      return;
    }
    router.push(doneHref ?? `/assessment/${data.assessmentId}/done`);
  }

  // ---- Intro / "Before You Begin" (PRD §6.2) -------------------------------
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
          <h1 className="text-xl font-bold text-text-primary">
            Before You Begin
          </h1>
          <ul className="mt-4 space-y-3 text-sm text-text-secondary">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              You&apos;ll see {data.totalQuestions} scenario questions across{" "}
              {data.areas.length} competency areas
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Pick the answer that best reflects your approach
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              You can save and resume anytime — every answer is saved
              automatically
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Submission is final
            </li>
          </ul>
          <div className="mt-8 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => router.push(exitHref)}>
              Cancel
            </Button>
            <Button onClick={() => setPhase("answer")}>I Understand</Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Review screen (PRD §6.2 / FR-SLF-005) -------------------------------
  if (phase === "review") {
    return (
      <div className="mx-auto max-w-3xl pb-28">
        <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-border bg-bg/90 px-6 py-3 backdrop-blur">
          <h1 className="text-lg font-bold text-text-primary">
            Review Your Answers
          </h1>
          <p className="text-sm text-text-secondary">
            Check everything below, then submit. You can edit any answer.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {flatQuestions.map((q) => {
            const sel = answers[q.id];
            return (
              <div
                key={q.id}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-text-tertiary">
                      Q{q.n} · Area {q.areaCode}
                    </div>
                    <p className="mt-1 text-sm font-medium text-text-primary">
                      {q.text}
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {sel ? (
                        <>
                          <span className="font-semibold text-primary">
                            {sel}.
                          </span>{" "}
                          {optionText[q.id]?.[sel]}
                        </>
                      ) : (
                        <span className="text-danger">Not answered</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => editFromReview(q.id)}
                    className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-slate-50"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface px-6 py-3 lg:left-60">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Button variant="secondary" onClick={() => setPhase("answer")}>
              Back to questions
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={!complete}>
              {complete
                ? "Submit Final"
                : `Answer all ${data.totalQuestions} to submit`}
            </Button>
          </div>
        </div>

        <Modal
          open={confirmOpen}
          title="Submit assessment?"
          onClose={() => setConfirmOpen(false)}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? "Submitting…" : "Yes, Submit"}
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            Once submitted, your assessment is final and cannot be edited. Your
            manager will follow up once both sides are complete.
          </p>
        </Modal>
      </div>
    );
  }

  // ---- Answer phase --------------------------------------------------------
  return (
    <div className="mx-auto max-w-3xl pb-24">
      <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-border bg-bg/90 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-text-primary">
            Competency Questionnaire
          </h1>
          <span className="text-sm text-text-secondary">
            {answeredCount} / {data.totalQuestions} answered
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {readOnly && (
          <p className="mt-2 text-sm text-gap-strong">
            ✓ Submitted — your manager will follow up.
          </p>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="space-y-8">
        {data.areas.map((area) => {
          return (
            <section key={area.code}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
                {area.code}. {area.name}
              </h2>
              <div className="space-y-4">
                {area.subs.flatMap((sub) =>
                  sub.questions.map((q) => {
                    const n =
                      flatQuestions.find((fq) => fq.id === q.id)?.n ?? 0;
                    return (
                      <div
                        key={q.id}
                        id={`q-${q.id}`}
                        className="rounded-lg border border-border bg-surface p-5"
                      >
                        <div className="mb-3 flex gap-2">
                          <span className="text-sm font-semibold text-text-tertiary">
                            Q{n}
                          </span>
                          <p className="text-sm font-medium text-text-primary">
                            {q.text}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {q.options.map((o) => {
                            const checked = answers[q.id] === o.letter;
                            return (
                              <label
                                key={o.letter}
                                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                                  checked
                                    ? "border-primary bg-primary-light"
                                    : "border-border hover:bg-slate-50"
                                } ${readOnly ? "cursor-default opacity-80" : ""}`}
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  value={o.letter}
                                  checked={checked}
                                  disabled={readOnly}
                                  onChange={() => choose(q, o.letter)}
                                  className="mt-0.5 accent-primary"
                                />
                                <span className="text-text-secondary">
                                  {o.text}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }),
                )}
              </div>
            </section>
          );
        })}
      </div>

      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface px-6 py-3 lg:left-60">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <span className="text-sm text-text-secondary">
              {isPending ? "Saving…" : "All changes saved automatically"}
            </span>
            <Button onClick={() => setPhase("review")}>
              {complete
                ? "Review & Submit"
                : `Review — ${data.totalQuestions - answeredCount} unanswered`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
