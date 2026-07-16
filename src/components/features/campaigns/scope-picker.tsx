"use client";

import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import type { ScopeArea } from "@/lib/services/framework.service";

/** Controlled value for the questionnaire scope selection. */
export interface ScopeValue {
  mode: "full" | "custom";
  questionIds: Set<string>;
}

export const FULL_SCOPE_VALUE: ScopeValue = {
  mode: "full",
  questionIds: new Set(),
};

/** Every question id in a scope tree, in framework order. */
export function allQuestionIdsOf(tree: ScopeArea[]): string[] {
  return tree.flatMap((a) => a.subs.flatMap((s) => s.questions.map((q) => q.id)));
}

/**
 * Shared scope selector: full framework vs a custom pick of areas /
 * sub-competencies / individual questions, with a random quick-pick.
 * Used by the campaign builder and the one-on-one send form.
 */
export function ScopePicker({
  tree,
  value,
  onChange,
  title = "Test scope",
}: {
  tree: ScopeArea[];
  value: ScopeValue;
  onChange: (next: ScopeValue) => void;
  title?: string;
}) {
  const [randomN, setRandomN] = useState("20");
  const allQuestionIds = useMemo(() => allQuestionIdsOf(tree), [tree]);
  const selected = value.questionIds;

  function setMode(mode: "full" | "custom") {
    onChange({ ...value, mode });
  }

  function toggleQuestion(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange({ ...value, questionIds: next });
  }

  function toggleGroup(ids: string[]) {
    const next = new Set(selected);
    const allSelected = ids.every((id) => next.has(id));
    for (const id of ids) {
      if (allSelected) next.delete(id);
      else next.add(id);
    }
    onChange({ ...value, questionIds: next });
  }

  function pickRandom() {
    const n = Math.max(0, Math.min(Number(randomN) || 0, allQuestionIds.length));
    const shuffled = [...allQuestionIds].sort(() => Math.random() - 0.5);
    onChange({ ...value, questionIds: new Set(shuffled.slice(0, n)) });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="scopeMode"
            checked={value.mode === "full"}
            onChange={() => setMode("full")}
          />
          Full framework ({allQuestionIds.length} questions)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="scopeMode"
            checked={value.mode === "custom"}
            onChange={() => setMode("custom")}
          />
          Custom selection
        </label>
      </div>

      {value.mode === "custom" && (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-md bg-slate-50 p-2">
            <Shuffle className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500">Quick pick</span>
            <input
              type="number"
              min={1}
              max={allQuestionIds.length}
              value={randomN}
              onChange={(e) => setRandomN(e.target.value)}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={pickRandom}
              className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary/90"
            >
              Random questions
            </button>
            <span className="ml-auto text-xs font-medium text-slate-500">
              {selected.size} selected
            </span>
          </div>

          <div className="max-h-96 space-y-3 overflow-y-auto rounded-md border border-slate-200 p-3">
            {tree.map((area) => {
              const areaQ = area.subs.flatMap((s) => s.questions.map((q) => q.id));
              const areaAll =
                areaQ.length > 0 && areaQ.every((id) => selected.has(id));
              return (
                <div key={area.id}>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={areaAll}
                      onChange={() => toggleGroup(areaQ)}
                      className="h-4 w-4 rounded border-slate-300 text-primary"
                    />
                    {area.code}. {area.name}
                  </label>
                  <div className="ml-6 mt-1 space-y-1.5">
                    {area.subs.map((sub) => {
                      const subQ = sub.questions.map((q) => q.id);
                      const subAll =
                        subQ.length > 0 && subQ.every((id) => selected.has(id));
                      return (
                        <div key={sub.id}>
                          <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={subAll}
                              onChange={() => toggleGroup(subQ)}
                              className="h-4 w-4 rounded border-slate-300 text-primary"
                            />
                            {sub.code} {sub.name}
                            <span className="text-xs text-slate-400">
                              ({sub.questions.length})
                            </span>
                          </label>
                          <div className="ml-6 mt-1 space-y-1">
                            {sub.questions.map((q, i) => (
                              <label
                                key={q.id}
                                className="flex items-start gap-2 text-xs text-slate-500"
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.has(q.id)}
                                  onChange={() => toggleQuestion(q.id)}
                                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-primary"
                                />
                                <span className="line-clamp-1">
                                  Q{i + 1}. {q.text}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
