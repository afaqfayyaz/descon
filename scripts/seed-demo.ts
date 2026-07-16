/**
 * Seed a realistic demo organisation AND run several month-spanning assessment
 * campaigns end-to-end (self → manager → scoring), so every dashboard, chart
 * and employee-history view is populated with meaningful data.
 *
 * All demo accounts use the password "Caliber@123" and emails under
 * @caliber.demo so they are easy to clear/re-run. An HR admin
 * (hr@caliber.app / Caliber@123) is created if missing.
 *
 * Idempotent: clears demo users + ALL campaigns/assessments/results first,
 * so it is safe to re-run against a demo database.
 *
 * Usage: npm run seed:demo   (run AFTER npm run seed)
 */
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

import { getDb, getClient } from "@/lib/db/client";
import { COLLECTIONS } from "@/lib/db/collections";
import { ensureIndexes } from "@/lib/db/indexes";
import { jobFamilyRepo } from "@/lib/db/repositories/job-family.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { questionRepo } from "@/lib/db/repositories/question.repository";
import { campaignRepo } from "@/lib/db/repositories/campaign.repository";
import { assessmentRepo } from "@/lib/db/repositories/assessment.repository";
import { campaignService } from "@/lib/services/campaign.service";
import { assessmentService } from "@/lib/services/assessment.service";
import type { SystemRole } from "@/lib/domain/constants";
import type { User } from "@/lib/domain/types/user.types";

const DEMO_DOMAIN = "@caliber.demo";
const DAY = 24 * 60 * 60 * 1000;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** A date `months` months before now (day preserved best-effort). */
function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

async function main() {
  await ensureIndexes();
  const now = new Date();
  const db = await getDb();
  const passwordHash = await bcrypt.hash("Caliber@123", 12);

  const families = await jobFamilyRepo.findAll();
  const family = families[0];
  if (!family) throw new Error("Run `npm run seed` first (no job family).");

  const roles = await roleRepo.findAll();
  const roleByCode = new Map(roles.map((r) => [r.code, r._id]));
  const need = (code: string): ObjectId => {
    const id = roleByCode.get(code);
    if (!id) throw new Error(`Missing role ${code}; run seed.`);
    return id;
  };

  // --- Reset demo data ------------------------------------------------------
  await db
    .collection(COLLECTIONS.USERS)
    .deleteMany({ email: { $regex: `${DEMO_DOMAIN}$` } });
  await db.collection(COLLECTIONS.ASSESSMENT_CAMPAIGNS).deleteMany({});
  await db.collection(COLLECTIONS.ASSESSMENTS).deleteMany({});
  await db.collection(COLLECTIONS.ASSESSMENT_RESULTS).deleteMany({});

  // --- HR admin (idempotent) ------------------------------------------------
  let hr = await userRepo.findByEmail("hr@caliber.app");
  if (!hr) {
    hr = await userRepo.insert({
      email: "hr@caliber.app",
      fullName: "HR Admin",
      employeeCode: "HR-0001",
      passwordHash,
      authProvider: "local",
      designation: need("HEAD"),
      division: "Corporate",
      department: "HR",
      jobFamily: family._id,
      lineManagerId: null,
      systemRoles: ["hr_admin", "employee"] as SystemRole[],
      avatarUrl: null,
      phoneNumber: null,
      joinedAt: now,
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: null,
      updatedBy: null,
    });
    console.log("Created HR admin hr@caliber.app / Caliber@123");
  }

  const base = {
    passwordHash,
    authProvider: "local" as const,
    jobFamily: family._id,
    department: null,
    avatarUrl: null,
    phoneNumber: null,
    joinedAt: now,
    isActive: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
  };

  // --- Managers -------------------------------------------------------------
  const maria = await userRepo.insert({
    ...base,
    email: `maria.head${DEMO_DOMAIN}`,
    fullName: "Maria Head",
    employeeCode: "DEMO-MGR-001",
    designation: need("HEAD"),
    division: "ISD",
    lineManagerId: null,
    systemRoles: ["line_manager", "employee"] as SystemRole[],
  });
  const kamran = await userRepo.insert({
    ...base,
    email: `kamran.chief${DEMO_DOMAIN}`,
    fullName: "Kamran Chief",
    employeeCode: "DEMO-MGR-002",
    designation: need("CHIEF"),
    division: "Corporate",
    lineManagerId: null,
    systemRoles: ["line_manager", "employee"] as SystemRole[],
  });

  // --- Reports (multi-division, all designations) ---------------------------
  const reportDefs = [
    { email: "ahmed.raza", name: "Ahmed Raza", role: "MGR", div: "ISD", mgr: maria },
    { email: "sara.khan", name: "Sara Khan", role: "IC_DM", div: "EPC", mgr: maria },
    { email: "bilal.ahmed", name: "Bilal Ahmed", role: "MGR", div: "EPC", mgr: kamran },
    { email: "omar.farooq", name: "Omar Farooq", role: "IC_DM", div: "ISD", mgr: maria },
    { email: "ayesha.malik", name: "Ayesha Malik", role: "MGR", div: "IP", mgr: kamran },
    { email: "hassan.ali", name: "Hassan Ali", role: "IC_DM", div: "Construction", mgr: kamran },
    { email: "fatima.noor", name: "Fatima Noor", role: "HEAD", div: "Cluster", mgr: kamran },
    { email: "zain.abbas", name: "Zain Abbas", role: "IC_DM", div: "IP", mgr: maria },
    { email: "nadia.iqbal", name: "Nadia Iqbal", role: "MGR", div: "Corporate", mgr: kamran },
    { email: "usman.tariq", name: "Usman Tariq", role: "IC_DM", div: "Construction", mgr: maria },
  ];

  const reports: User[] = [];
  let i = 0;
  for (const r of reportDefs) {
    i += 1;
    const u = await userRepo.insert({
      ...base,
      email: `${r.email}${DEMO_DOMAIN}`,
      fullName: r.name,
      employeeCode: `DEMO-EMP-${String(i).padStart(3, "0")}`,
      designation: need(r.role),
      division: r.div,
      lineManagerId: r.mgr._id,
      systemRoles: ["employee"] as SystemRole[],
    });
    reports.push(u);
  }
  console.log(`Org created: 2 managers + ${reports.length} reports.`);

  // --- Framework structure --------------------------------------------------
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

  // --- Campaigns across months (oldest → newest, improving over time) -------
  const campaignPlan = [
    { name: "Q1 Baseline Assessment", months: 4, lock: true },
    { name: "Mid-Year Review", months: 2, lock: true },
    { name: "Current Competency Assessment", months: 0, lock: false },
  ];

  for (let ci = 0; ci < campaignPlan.length; ci++) {
    const plan = campaignPlan[ci]!;
    const start = monthsAgo(plan.months);
    const campaign = await campaignService.createCampaign(
      {
        name: plan.name,
        description: "Demo campaign with completed self + manager cycle.",
        jobFamilyId: family._id,
        participantIds: reports.map((r) => r._id),
        startDate: start,
        selfAssessmentDeadline: new Date(start.getTime() + 14 * DAY),
        managerAssessmentDeadline: new Date(start.getTime() + 21 * DAY),
        calibrationDeadline: new Date(start.getTime() + 28 * DAY),
      },
      hr._id,
    );
    await campaignService.launchCampaign(campaign._id, hr._id);

    const assessments = await assessmentRepo.findByCampaign(campaign._id);
    const selfSubmitted = new Date(start.getTime() + 3 * DAY);
    const mgrSubmitted = new Date(start.getTime() + 6 * DAY);
    const finalized = new Date(start.getTime() + 7 * DAY);

    for (let e = 0; e < assessments.length; e++) {
      const a = assessments[e]!;

      // Self answers (bias upward for later campaigns for a realistic trend).
      const answers = [];
      for (let s = 0; s < subs.length; s++) {
        const qs = questionsBySub.get(subs[s]!._id.toString()) ?? [];
        for (let qi = 0; qi < qs.length; qi++) {
          const q = qs[qi]!;
          const idx = clamp(1 + ci + ((e + s + qi) % 2), 0, q.options.length - 1);
          answers.push({
            questionId: q._id,
            questionVersion: q.version,
            selectedOption: q.options[idx]!.letter,
            answeredAt: selfSubmitted,
          });
        }
      }
      await db.collection(COLLECTIONS.ASSESSMENTS).updateOne(
        { _id: a._id },
        {
          $set: {
            "selfAssessment.answers": answers,
            "selfAssessment.status": "in_progress",
            "selfAssessment.startedAt": start,
          },
        },
      );
      await assessmentService.submitSelf(a._id, { actorId: a.employeeId });

      // Manager ratings (trend upward across campaigns).
      const ratings = subs.map((sub, s) => ({
        subCompetencyId: sub._id,
        rating: clamp(2 + ci + ((e + s) % 3) - 1, 1, 5),
        evidence: null,
        ratedAt: mgrSubmitted,
      }));
      await db.collection(COLLECTIONS.ASSESSMENTS).updateOne(
        { _id: a._id },
        {
          $set: {
            "managerAssessment.ratings": ratings,
            "managerAssessment.status": "in_progress",
            "managerAssessment.startedAt": start,
          },
        },
      );
      await assessmentService.submitManager(a._id, {
        actorId: hr._id,
        isHrAdmin: true,
      });

      // Backdate timestamps so history/trends span the correct months.
      await db.collection(COLLECTIONS.ASSESSMENTS).updateOne(
        { _id: a._id },
        {
          $set: {
            createdAt: start,
            updatedAt: finalized,
            "selfAssessment.submittedAt": selfSubmitted,
            "managerAssessment.submittedAt": mgrSubmitted,
            finalizedAt: finalized,
          },
        },
      );
      await db
        .collection(COLLECTIONS.ASSESSMENT_RESULTS)
        .updateMany(
          { assessmentId: a._id },
          { $set: { computedAt: finalized, createdAt: start, updatedAt: finalized } },
        );
    }

    await db
      .collection(COLLECTIONS.ASSESSMENT_CAMPAIGNS)
      .updateOne(
        { _id: campaign._id },
        { $set: { createdAt: start, updatedAt: finalized } },
      );
    if (plan.lock) {
      await campaignRepo.setStatus(campaign._id, "locked", hr._id);
    }
    console.log(
      `Campaign "${plan.name}" (${start.toISOString().slice(0, 10)}): ${assessments.length} scored assessments.`,
    );
  }

  console.log("\nDemo seed complete. Login: hr@caliber.app / Caliber@123");
  console.log("All demo employees password: Caliber@123");

  const client = await getClient();
  await client.close();
}

main().catch((err) => {
  console.error("seed-demo failed:", err);
  process.exit(1);
});
