/**
 * Create an application user — an account that administers the platform. These
 * are deliberately separate from staff: they are never assessed and never
 * appear in the People Directory.
 *
 * Usage:
 *   npm run create-admin -- --email hr@caliber.app --name "HR Admin" --password secret
 *   npm run create-admin -- --email root@caliber.app --name "Root" --password secret --super
 *
 * --super creates the break-glass super admin: it holds every permission and is
 * hidden from every list in the UI, so this script is the only way to make one.
 */
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

import { ensureIndexes } from "@/lib/db/indexes";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { jobFamilyRepo } from "@/lib/db/repositories/job-family.repository";
import { userRepo } from "@/lib/db/repositories/user.repository";
import { getClient } from "@/lib/db/client";
import { SYSTEM_ROLES, type SystemRole } from "@/lib/domain/constants";

function arg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1] as string;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required --${name}`);
}

async function main() {
  const isSuper = process.argv.includes("--super");
  const email = arg("email");
  const fullName = arg("name", isSuper ? "Super Admin" : "HR Admin");
  const password = arg("password");
  const systemRoles: SystemRole[] = isSuper
    ? [SYSTEM_ROLES.SUPER_ADMIN]
    : [SYSTEM_ROLES.HR_ADMIN];

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
    systemRoles,
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

  console.log(
    `Created ${isSuper ? "SUPER ADMIN (hidden from all UI)" : "HR Admin"}: ` +
      `${user.email} (${user._id.toString()})`,
  );
  const client = await getClient();
  await client.close();
}

main().catch((err) => {
  console.error("create-admin failed:", err);
  process.exit(1);
});
