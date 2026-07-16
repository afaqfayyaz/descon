import { Sidebar, type NavItem } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { RoleSwitcher, type RoleOption } from "@/components/layout/role-switcher";
import {
  NotificationBell,
  type NotificationDTO,
} from "@/components/layout/notification-bell";

interface Props {
  navItems: NavItem[];
  user: { name: string; email: string };
  roles: RoleOption[];
  activeRole: string;
  notifications: NotificationDTO[];
  unreadCount: number;
  children: React.ReactNode;
}

export function AppShell({
  navItems,
  user,
  roles,
  activeRole,
  notifications,
  unreadCount,
  children,
}: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar items={navItems} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="no-print flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 shadow-nav sm:px-6">
          <div className="flex items-center gap-2">
            <MobileNav items={navItems} />
            <span className="font-semibold tracking-tight text-primary lg:hidden">
              Caliber
            </span>
            <RoleSwitcher roles={roles} activeRole={activeRole} />
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
            />
            <div className="h-6 w-px bg-border" />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
