import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { jobFamilyRepo } from "@/lib/db/repositories/job-family.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { CampaignBuilder } from "@/components/features/campaigns/campaign-builder";

export default async function NewCampaignPage() {
  await requirePermission("campaign.create");
  const [jobFamilies, divisions] = await Promise.all([
    jobFamilyRepo.findAll(),
    userRepo.distinctDivisions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="text-sm text-slate-500 hover:text-primary"
        >
          ← Campaigns
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">New campaign</h1>
        <p className="text-sm text-slate-500">
          Target a job family and timeline. Participants are resolved when you
          create the draft.
        </p>
      </div>

      <CampaignBuilder
        jobFamilies={jobFamilies.map((jf) => ({
          id: jf._id.toString(),
          name: jf.name,
          code: jf.code,
        }))}
        divisions={divisions}
      />
    </div>
  );
}
