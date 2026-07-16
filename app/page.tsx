import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import type { SystemRole } from "@/lib/domain/constants";

/** Home route for each role (mirrors protected-layout's ROLE_HOME). */
const ROLE_HOME: Record<SystemRole, string> = {
  hr_admin: "/dashboard",
  executive: "/executive",
  line_manager: "/team",
  employee: "/assessment",
  system: "/assessment",
};
const PRIORITY: SystemRole[] = [
  "hr_admin",
  "executive",
  "line_manager",
  "employee",
];

/**
 * Root entry point. Caliber has no public marketing page — hitting the app URL
 * sends unauthenticated visitors straight to the login screen, and signed-in
 * users to their role's home.
 */
export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const roles = session.user.roles ?? [];
  const primary = PRIORITY.find((r) => roles.includes(r)) ?? "employee";
  redirect(ROLE_HOME[primary]);
}
