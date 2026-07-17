import { ObjectId } from "mongodb";
import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/sidebar";
import type { SystemRole } from "@/lib/domain/constants";
import { notificationService } from "@/lib/services/notification.service";

const ROLE_LABELS: Record<SystemRole, string> = {
  super_admin: "Super Admin",
  hr_admin: "HR Admin",
  line_manager: "Line Manager",
  executive: "Executive",
  employee: "Employee",
  system: "System",
};

const PRIORITY: SystemRole[] = [
  "super_admin",
  "hr_admin",
  "executive",
  "line_manager",
  "employee",
];

/** Home route for each role (used by the role switcher). */
const ROLE_HOME: Record<SystemRole, string> = {
  super_admin: "/dashboard",
  hr_admin: "/dashboard",
  executive: "/executive",
  line_manager: "/team",
  employee: "/assessment",
  system: "/assessment",
};

/** Build the sidebar from the union of the user's roles, grouped by section. */
function buildNav(input: SystemRole[]): NavItem[] {
  // The super admin sees everything an HR admin does; treating it as hr_admin
  // here keeps the nav rules below in one place rather than duplicating each
  // check. Its own permissions are granted separately in hasPermission.
  const roles = input.includes("super_admin")
    ? ([...input, "hr_admin", "executive"] as SystemRole[])
    : input;
  const items: NavItem[] = [];
  if (roles.includes("hr_admin")) {
    items.push({ href: "/dashboard", label: "Dashboard", icon: "dashboard", section: "Overview" });
  }
  if (roles.includes("executive") || roles.includes("hr_admin")) {
    items.push({ href: "/executive", label: "Executive", icon: "executive", section: "Overview" });
  }
  if (roles.includes("hr_admin")) {
    items.push(
      { href: "/employees", label: "People", icon: "users", section: "Manage" },
      { href: "/framework", label: "Framework", icon: "framework", section: "Manage" },
    );
  }
  if (roles.includes("hr_admin") || roles.includes("executive")) {
    items.push({ href: "/campaigns", label: "Campaigns", icon: "campaigns", section: "Manage" });
  }
  if (roles.includes("line_manager")) {
    items.push({ href: "/team", label: "My Team", icon: "team", section: "My Work" });
  }
  // Everyone can be assessed; HR additionally manages campaigns and
  // one-on-one assessments from this hub.
  items.push({
    href: "/assessment",
    label: "Assessments",
    icon: "assessment",
    section: "My Work",
  });
  if (roles.includes("hr_admin") || roles.includes("executive")) {
    items.push({ href: "/reports", label: "Reports", icon: "reports", section: "Insights" });
  }
  if (roles.includes("hr_admin")) {
    items.push(
      { href: "/audit", label: "Audit Log", icon: "audit", section: "Insights" },
      { href: "/settings", label: "Settings", icon: "settings", section: "Insights" },
    );
  }
  return items;
}

/** Shared authenticated shell used by every persona route group. */
export async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const roles = session.user.roles;
  const primary = PRIORITY.find((r) => roles.includes(r)) ?? "employee";
  const roleOptions = PRIORITY.filter((r) => roles.includes(r)).map((r) => ({
    role: r,
    label: ROLE_LABELS[r],
    href: ROLE_HOME[r],
  }));

  const { items, unread } = await notificationService.getInbox(
    new ObjectId(session.user.id),
  );
  const notifications = items.map((n) => ({
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <AppShell
      navItems={buildNav(roles)}
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      roles={roleOptions}
      activeRole={primary}
      notifications={notifications}
      unreadCount={unread}
    >
      {children}
    </AppShell>
  );
}
