import type { Session } from "next-auth";
import { SUPER_ADMIN_ROLE, type SystemRole } from "@/lib/domain/constants";
import { ForbiddenError } from "@/lib/utils/errors";
import { requireSession } from "@/lib/auth/session";

/**
 * RBAC permission map (ARCHITECTURE.md §Authorization).
 * Values are the roles allowed to perform each permission. The literal "*"
 * means "any authenticated user". Keys may end in ".*" to grant a whole group.
 */
export const PERMISSIONS: Record<string, ReadonlyArray<SystemRole | "*">> = {
  // Framework management (HR only)
  "framework.view": ["hr_admin", "executive"],
  "framework.family.*": ["hr_admin"],
  "framework.area.create": ["hr_admin"],
  "framework.area.update": ["hr_admin"],
  "framework.area.delete": ["hr_admin"],
  "framework.subCompetency.*": ["hr_admin"],
  "framework.question.*": ["hr_admin"],
  "framework.role.*": ["hr_admin"],
  "framework.requiredLevel.*": ["hr_admin"],

  // Campaigns
  "campaign.create": ["hr_admin"],
  "campaign.launch": ["hr_admin"],
  "campaign.finalize": ["hr_admin"],
  "campaign.view": ["hr_admin", "executive"],

  // Assessment
  "assessment.self.submit": ["*"],
  "assessment.manager.rate": ["line_manager", "hr_admin"],
  "assessment.view.own": ["*"],
  "assessment.view.team": ["line_manager", "hr_admin"],
  "assessment.view.all": ["hr_admin", "executive"],

  // Reports
  "report.team": ["line_manager", "hr_admin"],
  "report.org": ["hr_admin", "executive"],
  "report.export": ["hr_admin", "executive"],

  // Admin
  "user.manage": ["hr_admin"],
  "training.manage": ["hr_admin"],
  "training.view": ["hr_admin", "line_manager"],
  "audit.view": ["hr_admin"],
  "settings.manage": ["hr_admin"],
  "notification.send": ["hr_admin"],
};

function allowedRolesFor(
  permission: string,
): ReadonlyArray<SystemRole | "*"> | null {
  if (PERMISSIONS[permission]) return PERMISSIONS[permission];

  // Wildcard fallback: "framework.subCompetency.create" → "framework.subCompetency.*"
  const parts = permission.split(".");
  while (parts.length > 0) {
    parts[parts.length - 1] = "*";
    const key = parts.join(".");
    if (PERMISSIONS[key]) return PERMISSIONS[key];
    parts.pop();
  }
  return null;
}

/** Pure check: does this set of roles satisfy the permission? */
export function hasPermission(
  roles: ReadonlyArray<SystemRole>,
  permission: string,
): boolean {
  // The break-glass account bypasses the map entirely, so a permission added
  // later can never lock it out.
  if (roles.includes(SUPER_ADMIN_ROLE)) return true;

  const allowed = allowedRolesFor(permission);
  if (!allowed) return false;
  if (allowed.includes("*")) return true;
  return roles.some((r) => allowed.includes(r));
}

/**
 * Server-side guard: require an authenticated user holding `permission`.
 * Redirects to /login when unauthenticated; throws ForbiddenError otherwise.
 */
export async function requirePermission(permission: string): Promise<Session> {
  const session = await requireSession();
  if (!hasPermission(session.user.roles, permission)) {
    throw new ForbiddenError(permission);
  }
  return session;
}
