"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { RATING_SCALE } from "@/lib/domain/constants";
import {
  saveRatingAction,
  submitManagerAction,
} from "@/lib/actions/manager-rating.actions";
import type { ManagerSheet } from "@/lib/services/questionnaire.service";

interface LocalRating {
  rating: number | null;
  evidence: string;
}

type SaveResult = { success: boolean; progress?: number; error?: string };

export function RatingForm({
  data,
  saveRating,
  submitRatings,
  doneHref,
  exitHref = "/team",
}: {
  data: ManagerSheet;
  /** Override the save action (token flow). Defaults to the session action. */
  saveRating?: (
    subCompetencyId: string,
    rating: number,
    evidence: string | null,
  ) => Promise<SaveResult>;
  /** Override the submit action (token flow). */
  submitRatings?: () => Promise<SaveResult>;
  doneHref?: string;
  exitHref?: string;
}) {
  const router = useRouter();
  const readOnly = data.status === "submitted";
  const doSaveRating =
    saveRating ??
    ((subCompetencyId: string, rating: number, evidence: string | null) =>
      saveRatingAction(data.assessmentId, subCompetencyId, rating, evidence));
  const doSubmit =
    submitRatings ?? (() => submitManagerAction(data.assessmentId));

  const initial = useMemo(() => {
    const m: Record<string, LocalRating> = {};
    for (const area of data.areas)
      for (const sub of area.subs)
        m[sub.id] = { rating: sub.rating, evidence: sub.evidence ?? "" };
    return m;
  }, [data]);

  const [ratings, setRatings] = useState<Record<string, LocalRating>>(initial);
  const [progress, setProgress] = useState(data.progress);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const ratedCount = Object.values(ratings).filter(
    (r) => r.rating !== null,
  ).length;
  const complete = ratedCount >= data.totalSubs;

  function persist(subId: string, next: LocalRating) {
    if (next.rating === null) return;
    startTransition(async () => {
      const res = await doSaveRating(
        subId,
        next.rating!,
        next.evidence.trim() || null,
      );
      if (!res.success) setError(res.error ?? "Something went wrong");
      else if (res.progress !== undefined) setProgress(res.progress);
    });
  }

  function setRating(subId: string, rating: number) {
    if (readOnly) return;
    const next = { ...ratings[subId]!, rating };
    setRatings((p) => ({ ...p, [subId]: next }));
    persist(subId, next);
  }

  function setEvidence(subId: string, evidence: string) {
    if (readOnly) return;
    setRatings((p) => ({ ...p, [subId]: { ...p[subId]!, evidence } }));
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
    router.push(doneHref ?? exitHref);
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-slate-200 bg-bg/90 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Rating {data.employeeName}
              {data.employeeRole || data.employeeDivision ? (
                <span className="font-normal text-slate-500">
                  {" "}
                  ({[data.employeeRole, data.employeeDivision]
                    .filter(Boolean)
                    .join(", ")}
                  )
                </span>
              ) : null}
            </h1>
            <p className="text-xs text-slate-500">
              Assess each sub-competency on the 1–5 scale. You cannot see the
              employee&apos;s self-assessment (prevents bias).
            </p>
          </div>
          <span className="text-sm text-slate-500">
            {ratedCount} / {data.totalSubs} rated
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {readOnly && (
          <p className="mt-2 text-sm text-gap-strong">✓ Submitted.</p>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-gap-critical/10 px-3 py-2 text-sm text-gap-critical">
          {error}
        </p>
      )}

      <div className="space-y-8">
        {data.areas.map((area) => (
          <section key={area.code}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
              {area.code}. {area.name}
            </h2>
            <div className="space-y-4">
              {area.subs.map((sub) => {
                const local = ratings[sub.id]!;
                return (
                  <div
                    key={sub.id}
                    className="rounded-lg border border-slate-200 bg-white p-5"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {sub.code} {sub.name}
                        </p>
                        {sub.description && (
                          <p className="mt-1 text-xs text-slate-500">
                            {sub.description}
                          </p>
                        )}
                        {sub.indicators.length > 0 && (
                          <ul className="mt-1 list-disc pl-5 text-xs text-slate-500">
                            {sub.indicators.map((ind, i) => (
                              <li key={i}>{ind}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {sub.requiredLevel !== null && (
                        <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">
                          Required: L{sub.requiredLevel}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {RATING_SCALE.map((scale) => {
                        const active = local.rating === scale.level;
                        return (
                          <button
                            key={scale.level}
                            type="button"
                            disabled={readOnly}
                            onClick={() => setRating(sub.id, scale.level)}
                            className={`flex-1 min-w-[5.5rem] rounded-md border px-2 py-2 text-center text-xs transition-colors ${
                              active
                                ? "border-primary bg-primary text-white"
                                : "border-slate-200 hover:bg-slate-50"
                            } ${readOnly ? "cursor-default" : ""}`}
                          >
                            <span className="block text-sm font-bold">
                              {scale.level}
                            </span>
                            <span className="block">{scale.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      value={local.evidence}
                      disabled={readOnly}
                      onChange={(e) => setEvidence(sub.id, e.target.value)}
                      onBlur={() => persist(sub.id, ratings[sub.id]!)}
                      placeholder="Evidence / notes (optional)"
                      rows={2}
                      className="mt-3 w-full rounded-md border border-slate-200 p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-50"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-6 py-3 lg:left-60">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <span className="text-sm text-slate-500">
              {isPending ? "Saving…" : "All changes saved automatically"}
            </span>
            <Button onClick={() => setConfirmOpen(true)} disabled={!complete}>
              {complete
                ? "Submit ratings"
                : `Rate all ${data.totalSubs} to submit`}
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={confirmOpen}
        title={`Submit rating for ${data.employeeName}?`}
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
        <p className="text-sm text-slate-600">
          Once submitted, this rating is locked unless HR reopens it. Make sure
          all {data.totalSubs} sub-competencies reflect your assessment.
        </p>
      </Modal>
    </div>
  );
}
