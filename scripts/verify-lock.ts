/**
 * One-off workflow verification: take the most recent Active campaign through
 *   move-to-calibration → calibration adjustment → lock
 * and print the resulting statuses. Safe to run after `npm run cycle`.
 *
 * Usage: npx tsx scripts/verify-lock.ts
 */
import { getClient, getDb } from "@/lib/db/client";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { campaignService } from "@/lib/services/campaign.service";
import { calibrationService } from "@/lib/services/calibration.service";
import { CAMPAIGN_STATUS } from "@/lib/domain/constants";

async function main() {
  const hr = await userRepo.findByEmail("hr@caliber.app");
  if (!hr) throw new Error("Run `npm run seed:demo` first.");

  const db = await getDb();
  const campaign = await db
    .collection("assessmentCampaigns")
    .findOne({ status: CAMPAIGN_STATUS.ACTIVE }, { sort: { createdAt: -1 } });
  if (!campaign) throw new Error("No Active campaign found — run `npm run cycle` first.");
  console.log(`Campaign under test: "${campaign.name}" (${campaign.status})`);

  // 1) Active → In Calibration
  const cal = await campaignService.moveToCalibration(campaign._id as any, hr._id);
  console.log(`→ moveToCalibration OK · status=${cal.status}`);

  // 2) Apply one calibration adjustment (HR overrides a manager rating)
  const assessments = await assessmentRepo.findByCampaign(campaign._id as any);
  const submitted = assessments.find((a) => a.managerAssessment.status === "submitted");
  if (submitted) {
    const firstRating = submitted.managerAssessment.ratings[0];
    if (firstRating) {
      await calibrationService.adjustRating(
        submitted._id,
        firstRating.subCompetencyId,
        Math.min(5, firstRating.rating + 1),
        "Workflow verification: calibration workshop adjustment",
        hr._id,
      );
      console.log("→ calibration adjustRating OK (one rating adjusted with reason)");
    }
  }

  // 3) In Calibration → Locked (finalizes + freezes results)
  const locked = await campaignService.lockCampaign(campaign._id as any, hr._id);
  console.log(
    `→ lockCampaign OK · finalized=${locked.finalized} resultsFrozen=${locked.resultsFrozen}`,
  );

  // 4) Confirm final state + guard rails
  const refreshed = await campaignRepo.findById(campaign._id as any);
  console.log(`Final campaign status: ${refreshed?.status}`);
  console.log("Final stats:", refreshed?.stats);

  // Negative test: locking twice must be rejected
  try {
    await campaignService.lockCampaign(campaign._id as any, hr._id);
    console.log("✗ ERROR: double-lock was allowed (should have thrown)");
  } catch (e: any) {
    console.log(`→ guard rail OK: double-lock rejected ("${e.message}")`);
  }

  const client = await getClient();
  await client.close();
}

main().catch((err) => {
  console.error("verify-lock failed:", err);
  process.exit(1);
});
