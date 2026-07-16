import Link from "next/link";
import { ObjectId } from "mongodb";
import { ChevronLeft } from "lucide-react";

import { requirePermission } from "@/lib/auth/permissions";
import { frameworkService } from "@/lib/services/framework.service";
import {
  QuestionsManager,
  type QuestionRow,
} from "@/components/features/framework/questions-manager";

export default async function SubQuestionsPage({
  params,
}: {
  params: { subId: string };
}) {
  await requirePermission("framework.view");
  const { sub, questions } = await frameworkService.listSubWithQuestions(
    new ObjectId(params.subId),
  );

  const rows: QuestionRow[] = questions.map((q) => ({
    id: q._id.toString(),
    text: q.text,
    sequence: q.sequence,
    version: q.version,
    weight: q.weight ?? 1,
    options: q.options.map((o) => ({
      letter: o.letter,
      text: o.text,
      score: o.score,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/framework/areas/${sub.areaId.toString()}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> Back to area
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          <span className="text-primary">{sub.code}</span> {sub.name}
        </h1>
        <p className="text-sm text-slate-500">{rows.length} questions</p>
      </div>

      <QuestionsManager
        subCompetencyId={sub._id.toString()}
        questions={rows}
      />
    </div>
  );
}
