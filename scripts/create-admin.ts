/**
 * Create the first HR Admin user (local credentials fallback).
 *
 * Usage:
 *   npm run create-admin -- --email hr@caliber.app --name "HR Admin" --password secret
 */
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

import { ensureIndexes } from "@/lib/db/indexes";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { jobFamilyRepo } from "@/lib/db/repositories/job-family.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { getClient } from "@/lib/db/client";

function arg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1] as string;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required --${name}`);
}

async function main() {
  const email = arg("email");
  const fullName = arg("name", "HR Admin");
  const password = arg("password");

  await ensureIndexes();

  const existing = await userRepo.findByEmail(email);
  if (existing) {
    console.log(`User ${email} already exists (${existing._id.toString()}).`);
    const client = await getClient();
    await client.close();
    return;
  }

  const roles = await roleRepo.findAll();
  const families = await jobFamilyRepo.findAll();
  const now = new Date();

  const user = await userRepo.insert({
    email,
    fullName,
    employeeCode: `HR-${Date.now()}`,
    passwordHash: await bcrypt.hash(password, 12),
    authProvider: "local",
    designation: roles[0]?._id ?? new ObjectId(),
    division: "Corporate",
    department: "HR",
    jobFamily: families[0]?._id ?? new ObjectId(),
    lineManagerId: null,
    // hr_admin only — this is an administrator account, not a person being
    // assessed, so it must not show up in the employee directory or headcount.
    // The employee role grants nothing extra anyway: the permissions staff rely
    // on (assessment.self.submit, assessment.view.own) are open to any signed-in
    // user via "*".
    systemRoles: ["hr_admin"],
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

  console.log(`Created HR Admin: ${user.email} (${user._id.toString()})`);
  const client = await getClient();
  await client.close();
}

main().catch((err) => {
  console.error("create-admin failed:", err);
  process.exit(1);
});
