"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, TrendingDown, Package, Building2,
  DollarSign, Users, ArrowUpRight, Loader2, ShoppingCart
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useTheme } from "next-themes";
import { cn, formatCurrency } from "@/lib/utils";

const COLORS = ["#f97316","#22c55e","#3b82f6","#8b5cf6","#ec4899","#06b6d4","#eab308"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          {entry.name}: <span className="font-medium">{typeof entry.value === "number" && entry.value > 1000 ? `UGX ${entry.value.toLocaleString()}` : entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#334155" : "#f1f5f9";

  const { data: revenue, isLoading: revLoading } = useQuery({
    queryKey: ["analytics-revenue"],
    queryFn: async () => { const r = await fetch("/api/analytics/revenue"); return r.json(); },
  });
  const { data: projects } = useQuery({
    queryKey: ["analytics-projects"],
    queryFn: async () => { const r = await fetch("/api/analytics/projects"); return r.json(); },
  });
  const { data: expenses } = useQuery({
    queryKey: ["analytics-expenses"],
    queryFn: async () => { const r = await fetch("/api/analytics/expenses"); return r.json(); },
  });
  const { data: topItems } = useQuery({
    queryKey: ["analytics-top-items"],
    queryFn: async () => { const r = await fetch("/api/analytics/top-items"); return r.json(); },
  });
  const { data: summary } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: async () => { const r = await fetch("/api/analytics/summary"); return r.json(); },
  });

  const s = summary?.data || {};
  const statCards = [
    { label: "Total Revenue", value: formatCurrency(s.totalReceived || 0), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20", change: s.revenueChange },
    { label: "Total Expenses", value: formatCurrency(s.totalSpent || 0), icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20", change: s.expenseChange },
    { label: "Active Projects", value: s.activeProjects || 0, icon: Building2, color: "text-primary", bg: "bg-primary/5", change: null },
    { label: "Inventory Items", value: s.inventoryItems || 0, icon: Package, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20", change: null },
    { label: "Net Balance", value: formatCurrency((s.totalReceived || 0) - (s.totalSpent || 0)), icon: DollarSign, color: (s.totalReceived - s.totalSpent) >= 0 ? "text-blue-600" : "text-red-500", bg: "bg-blue-50 dark:bg-blue-950/20", change: null },
    { label: "Active Users", value: s.activeUsers || 0, icon: Users, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20", change: null },
  ];

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Business performance overview</p>
        </div>
        <BarChart3 className="w-5 h-5 text-primary" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={cn("p-4 rounded-2xl border border-border", card.bg)}>
            <div className={cn("w-8 h-8 rounded-lg bg-white/60 dark:bg-black/20 flex items-center justify-center mb-2", card.color)}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className={cn("text-lg font-bold font-display leading-tight", card.color)}>
              {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-1">Revenue vs Expenses</h3>
          <p className="text-xs text-muted-foreground mb-4">Last 6 months comparison</p>
          {revLoading ? <div className="h-56 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue?.data || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="cReceived" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                    <linearGradient id="cSpent" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="received" name="Received" stroke="#22c55e" strokeWidth={2.5} fill="url(#cReceived)" dot={false} />
                  <Area type="monotone" dataKey="spent" name="Spent" stroke="#f97316" strokeWidth={2.5} fill="url(#cSpent)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Project status pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-1">Project Status</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution by status</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={projects?.statusData || []} cx="50%" cy="45%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {(projects?.statusData || []).map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Expense breakdown + Top items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-1">Expense Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">By category</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenses?.data || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                  {(expenses?.data || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top used items */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-display font-semibold mb-1">Most Used Items</h3>
          <p className="text-xs text-muted-foreground mb-4">By purchase frequency &amp; volume</p>
          <div className="space-y-3">
            {(topItems?.items || []).length === 0 ? (
              <div className="h-40 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            ) : (topItems?.items || []).map((item: any, i: number) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{item._count?.purchaseItems || 0}×</p>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(((item._count?.purchaseItems || 0) / (topItems?.max || 1)) * 100, 100)}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-primary flex-shrink-0">{formatCurrency(item.unitPrice)}/{item.unit}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
