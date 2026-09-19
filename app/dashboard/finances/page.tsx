"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, ArrowRight, CreditCard, Send } from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";

export default function FinancesPage() {
  const { data: summary } = useQuery({
    queryKey: ["finances-summary"],
    queryFn: async () => {
      const res = await fetch("/api/reports/summary?period=month");
      return res.json();
    },
  });

  const s = summary?.summary || {};
  const breakdown = summary?.breakdown || {};

  const cards = [
    { label: "Money Received", value: s.totalReceived || 0, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20", href: "/dashboard/finances/received" },
    { label: "Total Expenses", value: s.totalSpent || 0, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20", href: "/dashboard/finances/expenses" },
    { label: "Net Balance", value: (s.totalReceived || 0) - (s.totalSpent || 0), icon: DollarSign, color: (s.totalReceived || 0) - (s.totalSpent || 0) >= 0 ? "text-blue-600" : "text-red-500", bg: "bg-blue-50 dark:bg-blue-950/20", href: "/dashboard/reports" },
    { label: "Transfers", value: 0, icon: Send, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20", href: "/dashboard/finances/transfers" },
  ];

  const links = [
    { href: "/dashboard/finances/received", label: "Money Received", icon: TrendingUp, desc: "Track all funds received on site", color: "bg-green-500" },
    { href: "/dashboard/finances/expenses", label: "Site Expenses", icon: TrendingDown, desc: "Utilities, charges, other costs", color: "bg-red-500" },
    { href: "/dashboard/finances/office", label: "Office Expenses", icon: CreditCard, desc: "Company office expenditures", color: "bg-amber-500" },
    { href: "/dashboard/finances/transfers", label: "Money Transfers", icon: Send, desc: "Funds sent to site managers", color: "bg-blue-500" },
  ];

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Finances</h1>
          <p className="text-sm text-muted-foreground">This month's financial overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link href={card.href}>
              <div className={cn("p-4 rounded-2xl border border-border hover:shadow-card-hover transition-all cursor-pointer", card.bg)}>
                <card.icon className={cn("w-5 h-5 mb-2", card.color)} />
                <p className={cn("text-lg font-bold font-display", card.color)}>{formatCurrency(card.value)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h3 className="font-semibold mb-4">Expense Breakdown (This Month)</h3>
          <div className="space-y-3">
            {[
              { label: "Purchases / Materials", value: breakdown.purchases || 0, color: "bg-brand-500" },
              { label: "Utilities", value: breakdown.utilities || 0, color: "bg-amber-500" },
              { label: "Site Charges", value: breakdown.charges || 0, color: "bg-orange-500" },
              { label: "Other Expenses", value: breakdown.otherExpenses || 0, color: "bg-purple-500" },
              { label: "Office Expenses", value: breakdown.officeExpenses || 0, color: "bg-blue-500" },
            ].filter(r => r.value > 0).map(row => {
              const pct = s.totalSpent > 0 ? (row.value / s.totalSpent) * 100 : 0;
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-semibold">{formatCurrency(row.value)}</span>
                    </div>
                    <div className="progress-bar">
                      <motion.div className={cn("h-full rounded-full", row.color)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link, i) => (
          <motion.div key={link.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
            <Link href={link.href}>
              <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-card-hover transition-all flex items-center gap-4 cursor-pointer group">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0", link.color)}>
                  <link.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
