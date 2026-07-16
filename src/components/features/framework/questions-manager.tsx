"use client";

import { useState, useTransition } from "react";
import { Pencil, Archive, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  archiveQuestionAction,
  createQuestionAction,
  updateQuestionAction,
} from "@/lib/actions/framework.actions";

export interface OptionRow {
  letter: string;
  text: string;
  score: number;
}

export interface QuestionRow {
  id: string;
  text: string;
  sequence: number;
  version: number;
  weight: number;
  options: OptionRow[];
}

interface Props {
  subCompetencyId: string;
  questions: QuestionRow[];
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function newOption(index: number): OptionRow {
  return { letter: LETTERS[index] ?? String(index + 1), text: "", score: index + 1 };
}

export function QuestionsManager({ subCompetencyId, questions }: Props) {
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [text, setText] = useState("");
  const [sequence, setSequence] = useState("");
  const [weight, setWeight] = useState("1");
  const [options, setOptions] = useState<OptionRow[]>([newOption(0), newOption(1)]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setText("");
    setSequence(String(questions.length + 1));
    setWeight("1");
    setOptions([newOption(0), newOption(1), newOption(2), newOption(3)]);
    setError(null);
    setCreating(true);
  }

  function openEdit(q: QuestionRow) {
    setText(q.text);
    setSequence(String(q.sequence));
    setWeight(String(q.weight ?? 1));
    setOptions(q.options.map((o) => ({ ...o })));
    setError(null);
    setEditing(q);
  }

  function close() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function setOption(i: number, patch: Partial<OptionRow>) {
    setOptions((prev) =>
      prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    );
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, newOption(prev.length)]);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions((prev) =>
      prev
        .filter((_, idx) => idx !== i)
        .map((o, idx) => ({ ...o, letter: LETTERS[idx] ?? String(idx + 1) })),
    );
  }

  function submit() {
    setError(null);
    const payload = {
      text: text.trim(),
      sequence: Number(sequence),
      weight: Number(weight),
      options: options.map((o) => ({
        letter: o.letter,
        text: o.text.trim(),
        score: Number(o.score),
      })),
    };
    startTransition(async () => {
      const res = editing
        ? await updateQuestionAction(editing.id, payload)
        : await createQuestionAction({ ...payload, subCompetencyId });
      if (res.success) close();
      else setError(res.error);
    });
  }

  function archive(q: QuestionRow) {
    if (!confirm("Archive this question? Submitted answers are preserved.")) return;
    startTransition(async () => {
      const res = await archiveQuestionAction(q.id);
      if (!res.success) alert(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </div>

      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
            No questions yet for this sub-competency.
          </div>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-slate-400">
                    Q{q.sequence} · v{q.version} · weight {q.weight ?? 1}×
                  </span>
                  <p className="mt-0.5 font-medium text-slate-800">{q.text}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(q)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => archive(q)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Archive"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {q.options.map((o) => (
                  <li key={o.letter} className="flex gap-2">
                    <span className="font-medium text-slate-400">{o.letter}.</span>
                    <span className="flex-1">{o.text}</span>
                    <span className="text-xs text-slate-400">{o.score} pts</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <Modal
        open={creating || editing !== null}
        title={editing ? "Edit question" : "New question"}
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
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Question / scenario
            </span>
            <textarea
              className={inputCls}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className="flex gap-3">
            <label className="block w-28">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Sequence
              </span>
              <input
                type="number"
                className={inputCls}
                value={sequence}
                onChange={(e) => setSequence(e.target.value)}
              />
            </label>
            <label className="block w-28">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Weight
              </span>
              <input
                type="number"
                min={0}
                step={0.5}
                className={inputCls}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <span className="mt-0.5 block text-[10px] text-slate-400">
                Higher = counts more in scoring
              </span>
            </label>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">
                Options (2–6)
              </span>
              <button
                type="button"
                onClick={addOption}
                disabled={options.length >= 6}
                className="text-xs text-primary hover:underline disabled:opacity-40"
              >
                + Add option
              </button>
            </div>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-sm font-medium text-slate-400">
                    {o.letter}
                  </span>
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Answer text"
                    value={o.text}
                    onChange={(e) => setOption(i, { text: e.target.value })}
                  />
                  <input
                    type="number"
                    className={`${inputCls} w-20`}
                    value={o.score}
                    onChange={(e) =>
                      setOption(i, { score: Number(e.target.value) })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className="rounded p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    aria-label="Remove option"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

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
