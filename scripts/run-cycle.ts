/**
 * End-to-end demo of the assessment cycle against the live database:
 *   create campaign → launch → self answers → manager ratings → scoring.
 * Prints the computed gap analysis for one employee and campaign stats.
 *
 * Usage: npm run cycle   (run AFTER `npm run seed` and `npm run seed:demo`)
 */
import { ObjectId } from "mongodb";

import { getClient } from "@/lib/db/client";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { jobFamilyRepo } from "@/lib/db/repositories/job-family.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { questionRepo } from "@/lib/db/repositories/question.repository";
import { campaignService } from "@/lib/services/campaign.service";
import { assessmentService } from "@/lib/services/assessment.service";
import { scoringService } from "@/lib/services/scoring.service";

const TRAFFIC_ICON: Record<string, string> = {
  strong: "🟢",
  developing: "🟡",
  needs_focus: "🟠",
  critical: "🔴",
};

async function main() {
  const hr = await userRepo.findByEmail("hr@caliber.app");
  if (!hr) throw new Error("Run `npm run create-admin` first.");
  const family = (await jobFamilyRepo.findAll())[0];
  if (!family) throw new Error("Run `npm run seed` first.");

  // Framework structure (ordered)
  const areas = await competencyAreaRepo.findByJobFamily(family._id);
  const subsByArea = await Promise.all(
    areas.map((a) => subCompetencyRepo.findByArea(a._id)),
  );
  const subs = subsByArea.flat();
  const questions = await questionRepo.findBySubs(subs.map((s) => s._id));
  const questionsBySub = new Map<string, typeof questions>();
  for (const q of questions) {
    const k = q.subCompetencyId.toString();
    if (!questionsBySub.has(k)) questionsBySub.set(k, []);
    questionsBySub.get(k)!.push(q);
  }

  // 1) Create + 2) launch campaign
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const campaign = await campaignService.createCampaign(
    {
      name: `Demo Cycle ${now.toISOString().slice(0, 10)}`,
      jobFamilyId: family._id,
      startDate: now,
      selfAssessmentDeadline: new Date(now.getTime() + 14 * day),
      managerAssessmentDeadline: new Date(now.getTime() + 21 * day),
      calibrationDeadline: new Date(now.getTime() + 28 * day),
    },
    hr._id,
  );
  const launch = await campaignService.launchCampaign(campaign._id, hr._id);
  console.log(
    `Campaign "${campaign.name}" launched · ${launch.assessmentsCreated} assessments`,
  );

  // Only run the cycle for actual reports (employees with a manager)
  const assessments = await assessmentRepo.findByCampaign(campaign._id);
  const reports = assessments.filter((a) => a.lineManagerId !== null);

  for (let e = 0; e < reports.length; e++) {
    const a = reports[e]!;

    // 3) Self answers — vary choices per employee to create realistic spread
    for (let s = 0; s < subs.length; s++) {
      const sub = subs[s]!;
      const qs = questionsBySub.get(sub._id.toString()) ?? [];
      for (let qi = 0; qi < qs.length; qi++) {
        const q = qs[qi]!;
        const opt = q.options[(e + s + qi) % q.options.length]!;
        await assessmentService.saveSelfAnswer(
          a._id,
          {
            questionId: q._id,
            questionVersion: q.version,
            selectedOption: opt.letter,
          },
          { actorId: a.employeeId },
        );
      }
    }
    await assessmentService.submitSelf(a._id, { actorId: a.employeeId });

    // 4) Manager ratings — HR acts on the manager's behalf for the demo
    for (let s = 0; s < subs.length; s++) {
      const sub = subs[s]!;
      const rating = ((e + s) % 5) + 1;
      await assessmentService.saveManagerRating(
        a._id,
        { subCompetencyId: sub._id, rating },
        { actorId: hr._id, isHrAdmin: true },
      );
    }
    await assessmentService.submitManager(a._id, {
      actorId: hr._id,
      isHrAdmin: true,
    });
  }

  // 5) Show one employee's computed result
  const first = reports[0]!;
  const emp = await userRepo.findById(first.employeeId);
  const rows = await scoringService.computeResults(first._id);
  console.log(`\nGap analysis for ${emp?.fullName} (${emp?.division}):`);
  console.log(
    "  code  self  mgr  req  gap   status        calibration",
  );
  for (const r of rows.slice(0, 10)) {
    const icon = r.trafficLight ? TRAFFIC_ICON[r.trafficLight] : "  ";
    console.log(
      `  ${r.subCode.padEnd(4)}  ${fmt(r.selfLevel)}  ${fmt(r.managerLevel)}  ${fmt(
        r.requiredLevel,
      )}  ${fmt(r.gap)}  ${icon} ${(r.trafficLight ?? "").padEnd(11)}  ${
        r.calibrationFlag ?? ""
      }`,
    );
  }
  console.log(`  … (${rows.length} sub-competencies total)`);

  const refreshed = await campaignRepo.findById(campaign._id);
  console.log("\nCampaign stats:", refreshed?.stats);

  const client = await getClient();
  await client.close();
}

function fmt(n: number | null): string {
  return (n === null ? "—" : String(n)).padStart(4);
}

main().catch((err) => {
  console.error("run-cycle failed:", err);
  process.exit(1);
});
