import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

import { userRepo } from "@/lib/db/repositories/user.repository";
import type { UserFilters } from "@/lib/db/repositories/user.repository";
import { roleRepo } from "@/lib/db/repositories/role.repository";
import { jobFamilyRepo } from "@/lib/db/repositories/job-family.repository";
import { auditService } from "@/lib/services/audit.service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/utils/errors";
import type { Actor } from "@/lib/domain/types/common.types";
import type { User } from "@/lib/domain/types/user.types";
import type {
  CreateApplicationUserInput,
  CreateUserInput,
  ImportUserRow,
  UpdateUserInput,
} from "@/lib/domain/validation/user.schema";
import { SUPER_ADMIN_ROLE } from "@/lib/domain/constants";

const BCRYPT_COST = 12;

export interface EmployeeListItem {
  id: string;
  fullName: string;
  email: string;
  employeeCode: string;
  division: string;
  department: string | null;
  designationName: string;
  jobFamilyName: string;
  managerName: string | null;
  systemRoles: string[];
  isActive: boolean;
}

export const employeeService = {
  async list(
    filters: UserFilters,
    options: { page: number; limit: number },
  ): Promise<{ items: EmployeeListItem[]; total: number }> {
    const [users, total] = await Promise.all([
      userRepo.findMany(filters, options),
      userRepo.count(filters),
    ]);

    // Resolve lookups in batches to avoid N+1.
    const roles = await roleRepo.findAll();
    const families = await jobFamilyRepo.findAll();
    const roleMap = new Map(roles.map((r) => [r._id.toString(), r.name]));
    const familyMap = new Map(families.map((f) => [f._id.toString(), f.name]));

    const managerIds = users
      .map((u) => u.lineManagerId)
      .filter((id): id is ObjectId => id !== null);
    const managers = await userRepo.findManyByIds(managerIds);
    const managerMap = new Map(
      managers.map((m) => [m._id.toString(), m.fullName]),
    );

    const items = users.map((u) => ({
      id: u._id.toString(),
      fullName: u.fullName,
      email: u.email,
      employeeCode: u.employeeCode,
      division: u.division,
      department: u.department,
      designationName: roleMap.get(u.designation.toString()) ?? "—",
      jobFamilyName: familyMap.get(u.jobFamily.toString()) ?? "—",
      managerName: u.lineManagerId
        ? (managerMap.get(u.lineManagerId.toString()) ?? null)
        : null,
      systemRoles: u.systemRoles,
      isActive: u.isActive,
    }));

    return { items, total };
  },

  async create(input: CreateUserInput, actor: Actor): Promise<User> {
    await assertUnique(input.email, input.employeeCode, null);

    const lineManagerId = input.lineManagerId ?? null;
    if (lineManagerId) await assertNoCycle(null, lineManagerId);

    const now = new Date();
    const passwordHash = input.password
      ? await bcrypt.hash(input.password, BCRYPT_COST)
      : null;

    const user = await userRepo.insert({
      email: input.email,
      fullName: input.fullName,
      employeeCode: input.employeeCode,
      passwordHash,
      authProvider: passwordHash ? "local" : "azure_ad",
      designation: input.designation,
      division: input.division,
      department: input.department ?? null,
      jobFamily: input.jobFamily,
      lineManagerId,
      systemRoles: input.systemRoles,
      avatarUrl: null,
      phoneNumber: input.phoneNumber ?? null,
      joinedAt: now,
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "user.created",
      entityType: "User",
      entityId: user._id,
      before: null,
      after: { email: user.email, employeeCode: user.employeeCode },
    });
    return user;
  },

  /**
   * Create an application user — an account that administers the platform and
   * is never assessed. Mirrors scripts/create-admin.
   *
   * designation/jobFamily/division are required by the User shape but carry no
   * meaning for an admin: they exist to place staff in the competency
   * framework. They're filled with the first available values purely to satisfy
   * the schema, and are never read, because application users are excluded from
   * the People Directory and from campaign targeting at the repository level.
   */
  async createApplicationUser(
    input: CreateApplicationUserInput,
    actor: Actor,
  ): Promise<User> {
    const existing = await userRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`Email "${input.email}" is already in use`);
    }

    const [roles, families] = await Promise.all([
      roleRepo.findAll(),
      jobFamilyRepo.findAll(),
    ]);
    const now = new Date();

    const user = await userRepo.insert({
      email: input.email,
      fullName: input.fullName,
      employeeCode: `APP-${now.getTime()}`,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
      authProvider: "local",
      designation: roles[0]?._id ?? new ObjectId(),
      division: "Corporate",
      department: null,
      jobFamily: families[0]?._id ?? new ObjectId(),
      lineManagerId: null,
      systemRoles: input.systemRoles,
      avatarUrl: null,
      phoneNumber: null,
      joinedAt: now,
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "user.application_created",
      entityType: "User",
      entityId: user._id,
      before: null,
      after: { email: user.email, systemRoles: user.systemRoles },
    });
    return user;
  },

  async update(
    id: ObjectId,
    input: UpdateUserInput,
    actor: Actor,
  ): Promise<User> {
    const current = await userRepo.findByIdAny(id);
    if (!current) throw new NotFoundError("Employee");
    await assertUnique(input.email, input.employeeCode, id);

    const lineManagerId = input.lineManagerId ?? null;
    if (lineManagerId) await assertNoCycle(id, lineManagerId);

    const updated = await userRepo.update(id, {
      fullName: input.fullName,
      email: input.email,
      employeeCode: input.employeeCode,
      designation: input.designation,
      jobFamily: input.jobFamily,
      division: input.division,
      department: input.department ?? null,
      lineManagerId,
      systemRoles: input.systemRoles,
      phoneNumber: input.phoneNumber ?? null,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    if (!updated) throw new NotFoundError("Employee");

    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "user.updated",
      entityType: "User",
      entityId: id,
      before: { email: current.email, roles: current.systemRoles },
      after: { email: updated.email, roles: updated.systemRoles },
    });
    return updated;
  },

  async deactivate(id: ObjectId, actor: Actor): Promise<void> {
    const current = await userRepo.findByIdAny(id);
    if (!current) throw new NotFoundError("Employee");
    if (id.equals(actor.id)) {
      throw new ConflictError("You cannot deactivate your own account");
    }
    // The break-glass account is hidden from every listing, so its id should
    // never surface in the UI — but guard the mutation too, so knowing the id
    // isn't enough to lock everyone out.
    if (current.systemRoles.includes(SUPER_ADMIN_ROLE)) {
      throw new NotFoundError("Employee");
    }
    await userRepo.update(id, {
      isActive: false,
      updatedAt: new Date(),
      updatedBy: actor.id,
    });
    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "user.deactivated",
      entityType: "User",
      entityId: id,
      before: { isActive: true },
      after: { isActive: false },
    });
  },

  /**
   * Bulk import rows. Resolves designation/jobFamily/manager by their codes.
   * Existing users (matched by employeeCode) are updated; new ones created.
   * Returns per-row outcomes so the UI can show a summary.
   */
  async bulkImport(
    rows: ImportUserRow[],
    actor: Actor,
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    const roles = await roleRepo.findAll();
    const families = await jobFamilyRepo.findAll();
    const roleByCode = new Map(roles.map((r) => [r.code.toUpperCase(), r._id]));
    const familyByCode = new Map(
      families.map((f) => [f.code.toUpperCase(), f._id]),
    );

    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    const now = new Date();

    for (const [i, row] of rows.entries()) {
      const designation = roleByCode.get(row.designationCode.toUpperCase());
      const jobFamily = familyByCode.get(row.jobFamilyCode.toUpperCase());
      if (!designation) {
        errors.push(`Row ${i + 1}: unknown designation "${row.designationCode}"`);
        continue;
      }
      if (!jobFamily) {
        errors.push(`Row ${i + 1}: unknown job family "${row.jobFamilyCode}"`);
        continue;
      }

      let lineManagerId: ObjectId | null = null;
      if (row.managerEmployeeCode) {
        const mgr = await userRepo.findByEmployeeCode(row.managerEmployeeCode);
        if (!mgr) {
          errors.push(
            `Row ${i + 1}: unknown manager code "${row.managerEmployeeCode}"`,
          );
          continue;
        }
        lineManagerId = mgr._id;
      }

      const existing = await userRepo.findByEmployeeCode(row.employeeCode);
      if (existing) {
        await userRepo.update(existing._id, {
          fullName: row.fullName,
          email: row.email,
          designation,
          jobFamily,
          division: row.division,
          department: row.department ?? null,
          lineManagerId,
          systemRoles: row.systemRoles,
          updatedAt: now,
          updatedBy: actor.id,
        });
        updated += 1;
      } else {
        await userRepo.insert({
          email: row.email,
          fullName: row.fullName,
          employeeCode: row.employeeCode,
          passwordHash: null,
          authProvider: "azure_ad",
          designation,
          division: row.division,
          department: row.department ?? null,
          jobFamily,
          lineManagerId,
          systemRoles: row.systemRoles,
          avatarUrl: null,
          phoneNumber: null,
          joinedAt: now,
          isActive: true,
          lastLoginAt: null,
          createdAt: now,
          updatedAt: now,
          createdBy: actor.id,
          updatedBy: actor.id,
        });
        created += 1;
      }
    }

    await auditService.log({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "user.created",
      entityType: "User",
      entityId: null,
      after: { bulkImport: true, created, updated, errors: errors.length },
    });
    return { created, updated, errors };
  },
};

async function assertUnique(
  email: string,
  employeeCode: string,
  excludeId: ObjectId | null,
): Promise<void> {
  const byEmail = await userRepo.findByEmail(email);
  if (byEmail && (!excludeId || !byEmail._id.equals(excludeId))) {
    throw new ConflictError(`Email "${email}" is already in use`);
  }
  const byCode = await userRepo.findByEmployeeCode(employeeCode);
  if (byCode && (!excludeId || !byCode._id.equals(excludeId))) {
    throw new ConflictError(`Employee code "${employeeCode}" is already in use`);
  }
}

/** Walk the proposed manager chain to ensure it never loops back to `userId`. */
async function assertNoCycle(
  userId: ObjectId | null,
  managerId: ObjectId,
): Promise<void> {
  if (userId && managerId.equals(userId)) {
    throw new ValidationError("An employee cannot be their own manager");
  }
  let cursor: ObjectId | null = managerId;
  let hops = 0;
  while (cursor && hops < 50) {
    if (userId && cursor.equals(userId)) {
      throw new ValidationError("This assignment creates a circular reporting line");
    }
    const mgr: User | null = await userRepo.findByIdAny(cursor);
    cursor = mgr?.lineManagerId ?? null;
    hops += 1;
  }
}
