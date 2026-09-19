"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, Package, DollarSign, FileText,
  Users, Settings, Bell, Menu, X, ChevronRight, HardHat,
  BarChart3, Send, Receipt, Shield, LogOut,
  Map, Camera, ClipboardList, TrendingUp, Wrench,
  Home, ChevronDown, Search, Moon, Sun, Monitor,
  BookOpen, Zap, Calendar, TrendingDown, ArrowLeft
} from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { cn, getInitials, getAvatarColor, getRoleLabel } from "@/lib/utils";
import type { Session } from "next-auth";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { GlobalSearch } from "@/components/ui/global-search";
import { LocationTracker } from "@/components/location/location-tracker";
import { UserRole } from "@prisma/client";

type AdminPanel = "admin" | "site";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  panel?: AdminPanel | "both";
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "both" },
  { label: "Projects", href: "/dashboard/projects", icon: Building2, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "site" },
  {
    label: "Inventory", href: "/dashboard/inventory", icon: Package, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "site",
    children: [
      { label: "Stock List", href: "/dashboard/inventory", icon: Package, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "site" },
      { label: "Usage & Restock", href: "/dashboard/inventory/usage", icon: TrendingDown, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "site" },
    ],
  },
  { label: "Purchases", href: "/dashboard/purchases", icon: Receipt, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "site" },
  { label: "Money Received", href: "/dashboard/finances/received", icon: TrendingUp, roles: ["SITE_MANAGER"], panel: "site" },
  { label: "Site Expenses", href: "/dashboard/finances/expenses", icon: Zap, roles: ["SITE_MANAGER"], panel: "site" },
  {
    label: "Finances", href: "/dashboard/finances", icon: DollarSign, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site",
    children: [
      { label: "Money Received", href: "/dashboard/finances/received", icon: TrendingUp, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site" },
      { label: "Site Expenses", href: "/dashboard/finances/expenses", icon: Zap, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site" },
      { label: "Office Expenses", href: "/dashboard/finances/office", icon: Wrench, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site" },
      { label: "Transfers", href: "/dashboard/finances/transfers", icon: Send, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "both" },
    ],
  },
  { label: "Requests", href: "/dashboard/requests", icon: ClipboardList, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "site" },
  {
    label: "Reports", href: "/dashboard/reports", icon: FileText, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site",
    children: [
      { label: "Comprehensive", href: "/dashboard/reports/comprehensive", icon: BarChart3, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site" },
      { label: "Daily Report", href: "/dashboard/reports/daily", icon: Calendar, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site" },
      { label: "Financial Reports", href: "/dashboard/reports/financial", icon: TrendingUp, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site" },
      { label: "Project Reports", href: "/dashboard/reports/projects", icon: Building2, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site" },
      { label: "Balance Sheet", href: "/dashboard/reports/balance-sheet", icon: BookOpen, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site" },
    ],
  },
  {
    label: "My Reports", href: "/dashboard/reports/site", icon: FileText, roles: ["SITE_MANAGER"], panel: "site",
    children: [
      { label: "Site Summary", href: "/dashboard/reports/site", icon: BarChart3, roles: ["SITE_MANAGER"], panel: "site" },
      { label: "Daily Report", href: "/dashboard/reports/daily", icon: Calendar, roles: ["SITE_MANAGER"], panel: "site" },
    ],
  },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site" },
  { label: "Site Analytics", href: "/dashboard/analytics", icon: BarChart3, roles: ["SITE_MANAGER"], panel: "site" },
  { label: "All Receipts", href: "/dashboard/receipts", icon: Receipt, roles: ["SYSTEM_ADMIN", "ACCOUNTANT"], panel: "site" },
  { label: "Site Media", href: "/dashboard/media", icon: Camera, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "site" },
  { label: "Map View", href: "/dashboard/map", icon: Map, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "both" },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "both" },
  { label: "User Management", href: "/dashboard/admin/users", icon: Users, roles: ["SYSTEM_ADMIN"], panel: "admin" },
  { label: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: Shield, roles: ["SYSTEM_ADMIN"], panel: "admin" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"], panel: "both" },
];

const bottomNavByRole: Record<string, { href: string; icon: React.ElementType; label: string }[]> = {
  SITE_MANAGER: [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/dashboard/projects", icon: Building2, label: "Projects" },
    { href: "/dashboard/inventory/usage", icon: Package, label: "Inventory" },
    { href: "/dashboard/reports/daily", icon: FileText, label: "Report" },
    { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  ],
  ACCOUNTANT: [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/dashboard/finances", icon: DollarSign, label: "Finances" },
    { href: "/dashboard/reports/comprehensive", icon: FileText, label: "Reports" },
    { href: "/dashboard/requests", icon: ClipboardList, label: "Requests" },
    { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  ],
  SYSTEM_ADMIN: [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/dashboard/projects", icon: Building2, label: "Projects" },
    { href: "/dashboard/finances", icon: DollarSign, label: "Finances" },
    { href: "/dashboard/reports/comprehensive", icon: FileText, label: "Reports" },
    { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  ],
};

// Pages considered "root" — no back button shown
const ROOT_PAGES = new Set([
  "/dashboard", "/dashboard/projects", "/dashboard/inventory",
  "/dashboard/purchases", "/dashboard/finances", "/dashboard/analytics",
  "/dashboard/settings", "/dashboard/notifications", "/dashboard/map",
  "/dashboard/reports", "/dashboard/admin/users", "/dashboard/admin/audit-logs",
  "/dashboard/media", "/dashboard/receipts", "/dashboard/requests",
]);

export function DashboardShell({ children, session }: { children: React.ReactNode; session: Session }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [panel, setPanel] = useState<AdminPanel>("site");
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const userRole = session.user.role as UserRole;

  const showBack = !ROOT_PAGES.has(pathname);

  useEffect(() => {
    const saved = window.localStorage.getItem("buildspark-panel") as AdminPanel | null;
    if (saved === "admin" || saved === "site") setPanel(saved);
    fetch("/api/profile")
      .then((r) => r.json())
      .then((profile) => {
        if (profile?.colorScheme && profile.colorScheme !== "orange") {
          document.documentElement.classList.add(`theme-${profile.colorScheme}`);
        }
      })
      .catch(() => {});
  }, []);

  const switchPanel = (next: AdminPanel) => {
    setPanel(next);
    window.localStorage.setItem("buildspark-panel", next);
  };

  const filteredNav = navItems.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    if (userRole !== "SYSTEM_ADMIN") return true;
    const itemPanel = item.panel || "both";
    return itemPanel === "both" || itemPanel === panel;
  });

  const bottomNav = bottomNavByRole[userRole] || bottomNavByRole.SYSTEM_ADMIN;

  const toggleExpand = (href: string) => {
    setExpandedItems(prev => prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]);
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  const ThemeIcon = theme === "dark" ? Sun : theme === "light" ? Monitor : Moon;
  const themeLabel = theme === "dark" ? "Light Mode" : theme === "light" ? "System" : "Dark Mode";

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const breadcrumb = pathname
    .split("/").filter(Boolean).slice(1)
    .map(s => s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
    .join(" › ") || "Dashboard";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <LocationTracker enabled={userRole === "SITE_MANAGER"} />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border flex flex-col md:relative md:translate-x-0 shadow-xl md:shadow-none"
      >
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#f97316,#c2410c)" }}>
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg">Build<span className="text-primary">Spark</span></span>
              <p className="text-[10px] text-muted-foreground leading-none">Spark Construction</p>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User info — click to go to settings */}
        <div className="p-4 border-b border-border">
          <Link href="/dashboard/settings" className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0", getAvatarColor(session.user.name))}>
              {getInitials(session.user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel(userRole)}</p>
            </div>
          </Link>
          {userRole === "SYSTEM_ADMIN" && (
            <div className="mt-3 grid grid-cols-2 gap-1 bg-muted p-1 rounded-xl">
              <button onClick={() => switchPanel("admin")}
                className={cn("px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all", panel === "admin" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                Admin Panel
              </button>
              <button onClick={() => switchPanel("site")}
                className={cn("px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all", panel === "site" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                Site Mgmt
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
          {filteredNav.map(item => (
            <SidebarNavItem key={item.href} item={item} isActive={isActive}
              expanded={expandedItems.includes(item.href)} onToggle={toggleExpand} userRole={userRole} />
          ))}
        </nav>

        {/* Footer — theme + logout */}
        <div className="p-3 border-t border-border space-y-1">
          <button onClick={() => setTheme(nextTheme)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <ThemeIcon className="w-4 h-4" /> {themeLabel}
          </button>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-card/95 backdrop-blur-xl border-b border-border flex items-center px-3 gap-2 sticky top-0 z-30">

          {/* Hamburger (mobile) */}
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0">
            <Menu className="w-5 h-5" />
          </button>

          {/* Back button — sub-pages only */}
          {showBack && (
            <button onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0 text-muted-foreground hover:text-foreground"
              title="Go back">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Home — always visible on desktop */}
          <Link href="/dashboard"
            className={cn("hidden md:flex p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0",
              pathname === "/dashboard" ? "text-primary bg-primary/10" : "text-muted-foreground")}
            title="Go to Dashboard">
            <Home className="w-4 h-4" />
          </Link>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground flex-1 min-w-0 ml-1">
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <span className="text-foreground font-medium truncate">{breadcrumb}</span>
          </div>
          <div className="flex-1 sm:flex-none" />

          {/* Theme toggle (mobile) */}
          <button onClick={() => setTheme(nextTheme)}
            className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground flex-shrink-0"
            title={themeLabel}>
            <ThemeIcon className="w-4 h-4" />
          </button>

          {/* Search */}
          <button onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors sm:w-44 flex-shrink-0">
            <Search className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:block text-xs">Search...</span>
          </button>

          <NotificationsDropdown userId={session.user.id} />

          {/* Avatar → settings */}
          <Link href="/dashboard/settings"
            className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-primary/30 hover:ring-primary transition-all", getAvatarColor(session.user.name))}
            title="Settings">
            {getInitials(session.user.name)}
          </Link>

          {/* Logout button — always visible on mobile header */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="md:hidden p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors flex-shrink-0"
            title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav safe-bottom md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {bottomNav.map(item => (
            <Link key={item.href} href={item.href}
              className={cn("flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all no-tap-highlight",
                isActive(item.href) ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <item.icon className={cn("w-5 h-5 transition-transform", isActive(item.href) && "scale-110")} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function SidebarNavItem({ item, isActive, expanded, onToggle, userRole }: {
  item: NavItem; isActive: (h: string) => boolean; expanded: boolean;
  onToggle: (h: string) => void; userRole: UserRole;
}) {
  const active = isActive(item.href);
  const filteredChildren = item.children?.filter(c => c.roles.includes(userRole));

  if (filteredChildren?.length) {
    const anyChildActive = filteredChildren.some(c => isActive(c.href));
    return (
      <div>
        <button onClick={() => onToggle(item.href)}
          className={cn("sidebar-item w-full", (active || anyChildActive) && "active")}>
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform flex-shrink-0", expanded && "rotate-180")} />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
              className="overflow-hidden ml-4 mt-0.5 space-y-0.5 border-l-2 border-border pl-3">
              {filteredChildren.map(child => (
                <Link key={child.href} href={child.href}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                    isActive(child.href) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                  <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{child.label}</span>
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
      {active && <ChevronRight className="w-3 h-3 opacity-60 flex-shrink-0" />}
    </Link>
  );
}
