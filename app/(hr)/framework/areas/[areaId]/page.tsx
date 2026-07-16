import Link from "next/link";
import { ObjectId } from "mongodb";
import { ChevronLeft } from "lucide-react";

import { requirePermission } from "@/lib/auth/permissions";
import { frameworkService } from "@/lib/services/framework.service";
import {
  SubsManager,
  type SubRow,
} from "@/components/features/framework/subs-manager";

export default async function AreaSubsPage({
  params,
}: {
  params: { areaId: string };
}) {
  await requirePermission("framework.view");
  const { area, subs } = await frameworkService.listAreaWithSubs(
    new ObjectId(params.areaId),
  );

  const rows: SubRow[] = subs.map((s) => ({
    id: s._id.toString(),
    code: s.code,
    name: s.name,
    description: s.description,
    behavioralIndicators: s.behavioralIndicators,
    sequence: s.sequence,
    questionCount: s.questionCount,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/framework"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> Framework
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          <span className="text-primary">{area.code}.</span> {area.name}
        </h1>
        <p className="text-sm text-slate-500">
          {rows.length} sub-competencies
        </p>
      </div>

      <SubsManager areaId={area._id.toString()} subs={rows} />
    </div>
  );
}
