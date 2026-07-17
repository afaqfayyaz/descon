import { z } from "zod";
import { objectIdSchema } from "./common.schema";

/**
 * Roles assignable through the UI. "super_admin" is deliberately absent: the
 * break-glass account may only be created out-of-band by scripts/create-admin
 * --super, so no request through this schema can ever grant it.
 */
const systemRoleSchema = z.enum([
  "employee",
  "line_manager",
  "hr_admin",
  "executive",
  "system",
]);

export const createUserSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(160),
  email: z.string().email("A valid email is required").max(200),
  employeeCode: z.string().min(1, "Employee code is required").max(40),
  designation: objectIdSchema,
  jobFamily: objectIdSchema,
  division: z.string().min(1, "Division is required").max(80),
  department: z.string().max(80).nullable().optional(),
  lineManagerId: objectIdSchema.nullable().optional(),
  systemRoles: z.array(systemRoleSchema).min(1, "At least one role"),
  phoneNumber: z.string().max(40).nullable().optional(),
  password: z.string().min(8).max(100).optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Editing a person. `password`, when present, resets their sign-in password.
 * `lineManagerId` is intentionally absent: reporting lines aren't maintained
 * through the edit form — raters are chosen at assessment send time — and an
 * omitted field must not wipe an existing relationship.
 */
export const updateUserSchema = createUserSchema.omit({
  lineManagerId: true,
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Creating an application user — an account that administers the platform.
 * Deliberately narrower than createUserSchema: an admin account has no
 * designation, job family, division or reporting line, because it is never
 * assessed. Only the two admin roles are offered; "super_admin" cannot be
 * granted here (see systemRoleSchema).
 */
export const createApplicationUserSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(160),
  email: z.string().email("A valid email is required").max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
  systemRoles: z
    .array(z.enum(["hr_admin", "executive"]))
    .min(1, "Pick at least one access level"),
});
export type CreateApplicationUserInput = z.infer<
  typeof createApplicationUserSchema
>;

/** One row from a bulk CSV/Excel import (codes resolved server-side). */
export const importUserRowSchema = z.object({
  fullName: z.string().min(1).max(160),
  email: z.string().email().max(200),
  employeeCode: z.string().min(1).max(40),
  designationCode: z.string().min(1).max(20),
  jobFamilyCode: z.string().min(1).max(20),
  division: z.string().min(1).max(80),
  department: z.string().max(80).optional().nullable(),
  managerEmployeeCode: z.string().max(40).optional().nullable(),
  systemRoles: z.array(systemRoleSchema).min(1),
});
export type ImportUserRow = z.infer<typeof importUserRowSchema>;
