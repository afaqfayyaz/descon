/**
 * Seed the Caliber framework (PM job family) into MongoDB.
 *
 * Reads src/data/framework-seed.json (extracted from the source Excel files)
 * and populates: jobFamilies, roles, competencyAreas, subCompetencies,
 * questions, and requiredLevels. Idempotent: clears framework collections first.
 *
 * Usage: npm run seed
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ObjectId } from "mongodb";

import { ensureIndexes } from "@/lib/db/indexes";
import { jobFamilyRepo } from "@/lib/db/repositories/job-family.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { competencyAreaRepo } from "@/lib/db/repositories/competency-area.repository";
import { subCompetencyRepo } from "@/lib/db/repositories/sub-competency.repository";
import { questionRepo } from "@/lib/db/repositories/question.repository";
import { requiredLevelRepo } from "@/lib/db/repositories/required-level.repository";
import { getClient } from "@/lib/db/client";

interface SeedOption {
  letter: string;
  text: string;
  score: number;
}
interface SeedQuestion {
  sequence: number;
  text: string;
  options: SeedOption[];
  weight?: number;
}
interface SeedSub {
  code: string;
  name: string;
  sequence: number;
  requiredLevels: Record<string, number>;
  questions: SeedQuestion[];
}
interface SeedArea {
  code: string;
  name: string;
  sequence: number;
  weight: number;
  subCompetencies: SeedSub[];
}
interface Seed {
  jobFamily: { name: string; code: string; description: string };
  roles: { name: string; code: string; level: number }[];
  areas: SeedArea[];
}

/** Maps the Excel role labels to the seeded role codes. */
const ROLE_LABEL_TO_CODE: Record<string, string> = {
  "IC/DM": "IC_DM",
  Manager: "MGR",
  Head: "HEAD",
  Chief: "CHIEF",
};

/**
 * Seeding wipes the framework collections, so refuse to run against a
 * production target unless the caller explicitly opts in with --force.
 */
function assertSafeTarget() {
  if (process.argv.includes("--force")) return;
  const uri = process.env.MONGODB_URI ?? "";
  const db = process.env.MONGODB_DB ?? "";
  const looksProd =
    process.env.NODE_ENV === "production" || /prod/i.test(`${uri} ${db}`);
  if (looksProd) {
    throw new Error(
      `Refusing to seed what looks like production (db="${db}"). ` +
        `This deletes all framework data. Re-run with --force if you are sure.`,
    );
  }
}

async function main() {
  assertSafeTarget();

  const now = new Date();
  const systemActor = null;

  const seedPath = resolve(process.cwd(), "src/data/framework-seed.json");
  const seed: Seed = JSON.parse(readFileSync(seedPath, "utf-8"));

  console.log("Ensuring indexes…");
  await ensureIndexes();

  console.log("Clearing existing framework collections…");
  await Promise.all([
    jobFamilyRepo.deleteAll(),
    roleRepo.deleteAll(),
    competencyAreaRepo.deleteAll(),
    subCompetencyRepo.deleteAll(),
    questionRepo.deleteAll(),
    requiredLevelRepo.deleteAll(),
  ]);

  // 1) Job family
  const jobFamily = await jobFamilyRepo.insert({
    name: seed.jobFamily.name,
    code: seed.jobFamily.code,
    description: seed.jobFamily.description,
    version: 1,
    status: "active",
    createdAt: now,
    updatedAt: now,
    createdBy: systemActor,
    updatedBy: systemActor,
  });
  console.log(`Job family: ${jobFamily.name} (${jobFamily.code})`);

  // 2) Roles
  const roleIdByCode = new Map<string, ObjectId>();
  for (const r of seed.roles) {
    const role = await roleRepo.insert({
      name: r.name,
      code: r.code,
      level: r.level,
      description: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: systemActor,
      updatedBy: systemActor,
    });
    roleIdByCode.set(r.code, role._id);
  }
  console.log(`Roles: ${seed.roles.length}`);

  // 3) Areas → sub-competencies → questions + required levels
  let subCount = 0;
  let qCount = 0;
  let rlCount = 0;

  for (const area of seed.areas) {
    const areaDoc = await competencyAreaRepo.insert({
      jobFamilyId: jobFamily._id,
      name: area.name,
      code: area.code,
      description: null,
      sequence: area.sequence,
      weight: area.weight,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: systemActor,
      updatedBy: systemActor,
    });

    for (const sub of area.subCompetencies) {
      const subDoc = await subCompetencyRepo.insert({
        areaId: areaDoc._id,
        name: sub.name,
        code: sub.code,
        description: null,
        behavioralIndicators: [],
        sequence: sub.sequence,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: systemActor,
        updatedBy: systemActor,
      });
      subCount += 1;

      // Questions
      qCount += await questionRepo.insertMany(
        sub.questions.map((q) => ({
          subCompetencyId: subDoc._id,
          text: q.text,
          options: q.options,
          weight: q.weight ?? 1,
          sequence: q.sequence,
          isActive: true,
          version: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: systemActor,
          updatedBy: systemActor,
        })),
      );

      // Required levels (one per role for this sub-competency)
      const rls = Object.entries(sub.requiredLevels)
        .map(([label, level]) => {
          const code = ROLE_LABEL_TO_CODE[label];
          const roleId = code ? roleIdByCode.get(code) : undefined;
          if (!roleId) return null;
          return {
            subCompetencyId: subDoc._id,
            roleId,
            requiredLevel: level,
            effectiveFrom: now,
            effectiveTo: null,
            createdAt: now,
            updatedAt: now,
            createdBy: systemActor,
            updatedBy: systemActor,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      rlCount += await requiredLevelRepo.insertMany(rls);
    }
  }

  console.log(`Areas: ${seed.areas.length}`);
  console.log(`Sub-competencies: ${subCount}`);
  console.log(`Questions: ${qCount}`);
  console.log(`Required levels: ${rlCount}`);
  console.log("Seed complete.");

  const client = await getClient();
  await client.close();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
