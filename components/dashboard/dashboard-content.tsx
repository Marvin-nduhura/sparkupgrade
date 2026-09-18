"use client";

import { motion } from "framer-motion";
import {
  Building2, DollarSign, TrendingUp, TrendingDown,
  ClipboardList, Users, ArrowUpRight, Activity,
  Package, BarChart3, AlertCircle, CheckCircle2,
  Clock, HardHat
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatRelative, getRoleLabel, getInitials, getAvatarColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Session } from "next-auth";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ProjectStatusChart } from "@/components/charts/project-status-chart";
import { GreetingCard } from "@/components/dashboard/greeting-card";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

interface DashboardContentProps {
  session: Session;
  stats: {
    activeProjects?: number;
    totalReceived?: number;
    totalSpent?: number;
    pendingRequests?: number;
    activeUsers?: number;
  };
  recentActivity: any[];
  assignedProjects: any[];
}

export function DashboardContent({
  session,
  stats,
  recentActivity,
  assignedProjects,
}: DashboardContentProps) {
  const balance = (stats.totalReceived || 0) - (stats.totalSpent || 0);
  const spendPercent =
    stats.totalReceived
      ? Math.round(((stats.totalSpent || 0) / stats.totalReceived) * 100)
      : 0;

  const statCards = [
    {
      label: "Active Projects",
      value: stats.activeProjects || 0,
      icon: Building2,
      color: "from-brand-500 to-brand-600",
      textColor: "text-brand-600",
      bgColor: "bg-brand-50 dark:bg-brand-950/30",
      href: "/dashboard/projects",
      suffix: "sites",
    },
    {
      label: "Total Received",
      value: formatCurrency(stats.totalReceived || 0),
      icon: TrendingUp,
      color: "from-green-500 to-emerald-600",
      textColor: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      href: "/dashboard/finances/received",
    },
    {
      label: "Total Spent",
      value: formatCurrency(stats.totalSpent || 0),
      icon: TrendingDown,
      color: "from-red-500 to-rose-600",
      textColor: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      href: "/dashboard/purchases",
    },
    {
      label: "Balance",
      value: formatCurrency(Math.abs(balance)),
      icon: DollarSign,
      color: balance >= 0 ? "from-blue-500 to-indigo-600" : "from-red-500 to-rose-600",
      textColor: balance >= 0 ? "text-blue-600" : "text-red-600",
      bgColor: balance >= 0 ? "bg-blue-50 dark:bg-blue-950/30" : "bg-red-50 dark:bg-red-950/30",
      prefix: balance < 0 ? "-" : "",
      href: "/dashboard/finances",
    },
    {
      label: "Pending Requests",
      value: stats.pendingRequests || 0,
      icon: ClipboardList,
      color: "from-amber-500 to-orange-600",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      href: "/dashboard/requests",
    },
  ];

  if (session.user.role === "SYSTEM_ADMIN") {
    statCards.push({
      label: "Active Users",
      value: stats.activeUsers || 0,
      icon: Users,
      color: "from-purple-500 to-violet-600",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      href: "/dashboard/admin/users",
      suffix: "users",
    });
  }

  return (
    <div className="page-container pb-24 md:pb-8">
      {/* Greeting */}
      <GreetingCard session={session} />

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-6"
      >
        {statCards.map((card, i) => (
          <motion.div key={card.label} variants={itemVariants}>
            <Link href={card.href}>
              <div className={cn(
                "stats-card border border-border card-hover cursor-pointer",
                card.bgColor
              )}>
                {/* Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
                  card.color
                )}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                {/* Value */}
                <p className={cn("text-xl sm:text-2xl font-bold font-display", card.textColor)}>
                  {card.prefix}{typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                  {card.suffix && <span className="text-xs font-normal ml-1 text-muted-foreground">{card.suffix}</span>}
                </p>
                {/* Label */}
                <p className="text-xs text-muted-foreground mt-1 font-medium">{card.label}</p>
                {/* Arrow */}
                <ArrowUpRight className={cn("w-3 h-3 mt-2 opacity-60", card.textColor)} />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Spend Progress */}
      {stats.totalReceived ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-4 sm:p-6 bg-card border border-border rounded-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm">Budget Utilization</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.totalSpent || 0)} of {formatCurrency(stats.totalReceived || 0)} spent
              </p>
            </div>
            <span className={cn(
              "text-2xl font-bold font-display",
              spendPercent > 90 ? "text-red-500" : spendPercent > 70 ? "text-amber-500" : "text-green-500"
            )}>
              {spendPercent}%
            </span>
          </div>
          <div className="progress-bar">
            <motion.div
              className="progress-bar-fill"
              style={{
                background: spendPercent > 90
                  ? "linear-gradient(90deg, #ef4444, #dc2626)"
                  : spendPercent > 70
                  ? "linear-gradient(90deg, #f59e0b, #ea580c)"
                  : "linear-gradient(90deg, #22c55e, #16a34a)"
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(spendPercent, 100)}%` }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            />
          </div>
          {spendPercent > 90 && (
            <div className="flex items-center gap-2 mt-2 text-red-500 text-xs">
              <AlertCircle className="w-3 h-3" />
              Budget nearly exhausted. Request additional funds.
            </div>
          )}
        </motion.div>
      ) : null}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">Financial Overview</h3>
              <p className="text-xs text-muted-foreground">Income vs Expenses (last 6 months)</p>
            </div>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </div>
          <RevenueChart />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold">Project Status</h3>
              <p className="text-xs text-muted-foreground">Distribution by status</p>
            </div>
          </div>
          <ProjectStatusChart />
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-6"
        >
          <div className="section-header mb-4">
            <div>
              <h3 className="font-display font-semibold">Projects</h3>
              <p className="text-xs text-muted-foreground">
                {session.user.role === "SITE_MANAGER" ? "Your assigned" : "Recent"} projects
              </p>
            </div>
            <Link
              href="/dashboard/projects"
              className="text-xs text-primary hover:underline font-medium"
            >
              View all →
            </Link>
          </div>

          <div className="space-y-3">
            {assignedProjects.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-sm text-muted-foreground">No projects yet</p>
              </div>
            ) : (
              assignedProjects.slice(0, 5).map((project: any) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center flex-shrink-0">
                    <HardHat className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {project.location}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      project.status === "ACTIVE" ? "badge-success" : "badge-warning"
                    )}>
                      {project.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-6"
        >
          <div className="section-header mb-4">
            <div>
              <h3 className="font-display font-semibold">Recent Activity</h3>
              <p className="text-xs text-muted-foreground">Latest system actions</p>
            </div>
            {session.user.role === "SYSTEM_ADMIN" && (
              <Link
                href="/dashboard/admin/audit-logs"
                className="text-xs text-primary hover:underline font-medium"
              >
                View all →
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center">
                <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              recentActivity.slice(0, 6).map((log: any) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                    log.user ? getAvatarColor(log.user.name) : "bg-muted"
                  )}>
                    {log.user ? getInitials(log.user.name) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">
                      <span className="font-semibold">{log.user?.name || "System"}</span>
                      {" "}{log.action.toLowerCase()} {log.resource.toLowerCase()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatRelative(log.createdAt)}
                    </p>
                  </div>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0",
                    log.action === "CREATE" ? "badge-success" :
                    log.action === "DELETE" ? "badge-error" :
                    log.action === "LOGIN" ? "badge-info" :
                    "badge-warning"
                  )}>
                    {log.action}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
