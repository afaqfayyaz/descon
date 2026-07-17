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

export const updateUserSchema = createUserSchema.omit({ password: true });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

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
