"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, Package, DollarSign, FileText,
  Users, Settings, Bell, Menu, X, ChevronRight, HardHat,
  BarChart3, Send, Receipt, Hammer, Shield, LogOut,
  Map, Camera, ClipboardList, TrendingUp, Wrench,
  Home, ChevronDown, Search, Moon, Sun, Monitor,
  CreditCard, AlertTriangle, BookOpen
} from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { cn, getInitials, getAvatarColor, getRoleLabel } from "@/lib/utils";
import type { Session } from "next-auth";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { GlobalSearch } from "@/components/ui/global-search";
import { UserRole } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"],
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: Building2,
    roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"],
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"],
  },
  {
    label: "Purchases",
    href: "/dashboard/purchases",
    icon: Receipt,
    roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"],
  },
  {
    label: "Finances",
    href: "/dashboard/finances",
    icon: DollarSign,
    roles: ["SYSTEM_ADMIN", "ACCOUNTANT"],
    children: [
      { label: "Money Received", href: "/dashboard/finances/received", icon: TrendingUp, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"] },
      { label: "Expenses", href: "/dashboard/finances/expenses", icon: CreditCard, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"] },
      { label: "Transfers", href: "/dashboard/finances/transfers", icon: Send, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"] },
      { label: "Office Expenses", href: "/dashboard/finances/office", icon: Wrench, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    label: "Requests",
    href: "/dashboard/requests",
    icon: ClipboardList,
    roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"],
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    roles: ["SYSTEM_ADMIN", "ACCOUNTANT"],
    children: [
      { label: "Project Reports", href: "/dashboard/reports/projects", icon: BarChart3, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"] },
      { label: "Financial Reports", href: "/dashboard/reports/financial", icon: TrendingUp, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"] },
      { label: "Balance Sheet", href: "/dashboard/reports/balance-sheet", icon: BookOpen, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    roles: ["SYSTEM_ADMIN", "ACCOUNTANT"],
  },
  {
    label: "Site Media",
    href: "/dashboard/media",
    icon: Camera,
    roles: ["SYSTEM_ADMIN", "SITE_MANAGER"],
  },
  {
    label: "Map View",
    href: "/dashboard/map",
    icon: Map,
    roles: ["SYSTEM_ADMIN", "SITE_MANAGER"],
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"],
  },
  // Admin only
  {
    label: "User Management",
    href: "/dashboard/admin/users",
    icon: Users,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    label: "Audit Logs",
    href: "/dashboard/admin/audit-logs",
    icon: Shield,
    roles: ["SYSTEM_ADMIN"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"],
  },
];

interface DashboardShellProps {
  children: React.ReactNode;
  session: Session;
}

export function DashboardShell({ children, session }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const userRole = session.user.role as UserRole;

  const filteredNav = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        <motion.aside
          initial={false}
          animate={{ x: sidebarOpen ? 0 : "-100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border flex flex-col md:relative md:translate-x-0 md:flex shadow-xl md:shadow-none"
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center shadow-brand">
                <HardHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-foreground">
                  Build<span className="text-primary">Spark</span>
                </span>
                <p className="text-[10px] text-muted-foreground leading-none">
                  Spark Construction
                </p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0",
                  session.user.image ? "" : getAvatarColor(session.user.name)
                )}
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name}
                    width={36}
                    height={36}
                    className="rounded-full object-cover"
                  />
                ) : (
                  getInitials(session.user.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {getRoleLabel(userRole)}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
            {filteredNav.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                isActive={isActive}
                expanded={expandedItems.includes(item.href)}
                onToggle={toggleExpand}
                userRole={userRole}
              />
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-border space-y-1">
            <button
              onClick={() =>
                setTheme(
                  theme === "dark"
                    ? "light"
                    : theme === "light"
                    ? "system"
                    : "dark"
                )
              }
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : theme === "light" ? (
                <Monitor className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              {theme === "dark"
                ? "Light Mode"
                : theme === "light"
                ? "System Theme"
                : "Dark Mode"}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-card/80 backdrop-blur-xl border-b border-border flex items-center px-4 gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground flex-1">
            <Home className="w-4 h-4" />
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium capitalize">
              {pathname.split("/").slice(-1)[0].replace(/-/g, " ") ||
                "Dashboard"}
            </span>
          </div>

          <div className="flex-1 md:flex-none" />

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors w-full max-w-xs"
          >
            <Search className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:block">Search...</span>
            <kbd className="hidden sm:block ml-auto text-xs bg-background px-1.5 py-0.5 rounded border border-border">
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <NotificationsDropdown userId={session.user.id} />

          {/* Avatar */}
          <Link
            href="/dashboard/settings/profile"
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ring-2 ring-primary/30 hover:ring-primary/60 transition-all",
              getAvatarColor(session.user.name)
            )}
          >
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name}
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              getInitials(session.user.name)
            )}
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav safe-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { href: "/dashboard", icon: Home, label: "Home" },
            { href: "/dashboard/projects", icon: Building2, label: "Projects" },
            {
              href: "/dashboard/requests",
              icon: ClipboardList,
              label: "Requests",
            },
            { href: "/dashboard/reports", icon: FileText, label: "Reports" },
            { href: "/dashboard/settings", icon: Settings, label: "Settings" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all no-tap-highlight",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 transition-transform",
                  isActive(item.href) && "scale-110"
                )}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

// Sidebar Nav Item Component
function SidebarNavItem({
  item,
  isActive,
  expanded,
  onToggle,
  userRole,
}: {
  item: NavItem;
  isActive: (href: string) => boolean;
  expanded: boolean;
  onToggle: (href: string) => void;
  userRole: UserRole;
}) {
  const active = isActive(item.href);
  const hasChildren = item.children && item.children.length > 0;
  const filteredChildren = item.children?.filter((c) =>
    c.roles.includes(userRole)
  );

  if (hasChildren && filteredChildren && filteredChildren.length > 0) {
    return (
      <div>
        <button
          onClick={() => onToggle(item.href)}
          className={cn(
            "sidebar-item w-full",
            active && "active"
          )}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden ml-4 mt-1 space-y-1 border-l-2 border-border pl-3"
            >
              {filteredChildren.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                    isActive(child.href)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <child.icon className="w-3.5 h-3.5" />
                  {child.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Link href={item.href} className={cn("sidebar-item", active && "active")}>
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
          {item.badge}
        </span>
      ) : null}
      {active && <ChevronRight className="w-3 h-3 opacity-60" />}
    </Link>
  );
}
