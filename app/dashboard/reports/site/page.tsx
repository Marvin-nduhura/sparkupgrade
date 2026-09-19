"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText, Download, Loader2, TrendingUp, TrendingDown, DollarSign, Package
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { PeriodSelector, usePeriodDates, type PeriodState } from "@/components/reports/period-selector";

export default function SiteManagerReportPage() {
  const [ps, setPs] = useState<PeriodState>({
    period: "day", startDate: "", endDate: "",
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1).padStart(2, "0"),
  });
  const [projectId, setProjectId] = useState("");
  const [downloading, setDownloading] = useState("");

  const { period: apiPeriod, startDate: apiStart, endDate: apiEnd } = usePeriodDates(ps);

  const { data: projectsData } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); },
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ["site-report", projectId, apiPeriod, apiStart, apiEnd],
    queryFn: async () => {
      const p = new URLSearchParams({ period: apiPeriod });
      if (projectId) p.set("projectId", projectId);
      if (apiStart) p.set("startDate", apiStart);
      if (apiEnd) p.set("endDate", apiEnd);
      const r = await fetch(`/api/reports/summary?${p}`);
      return r.json();
    },
  });

  const handleDownload = async (fmt: string) => {
    setDownloading(fmt);
    try {
      const p = new URLSearchParams({ format: fmt, period: apiPeriod });
      if (projectId) p.set("projectId", projectId);
      if (apiStart) p.set("startDate", apiStart);
      if (apiEnd) p.set("endDate", apiEnd);
      const res = await fetch(`/api/reports/download?${p}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `site-report-${Date.now()}.${fmt === "excel" ? "xlsx" : fmt === "word" ? "doc" : "html"}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Report downloaded!");
    } catch (e: any) { toast.error(e.message); }
    finally { setDownloading(""); }
  };

  const s = report?.summary || {};
  const projects = report?.projects || [];
  const breakdown = report?.breakdown || {};

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold font-display">My Reports</h1>
          <p className="text-sm text-muted-foreground">Daily, weekly, monthly &amp; custom site reports</p>
        </div>
        <div className="flex gap-2">
          {(["pdf", "excel", "word"] as const).map(fmt => (
            <motion.button key={fmt} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => handleDownload(fmt)} disabled={!!downloading}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                fmt === "pdf" ? "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-800" :
                fmt === "excel" ? "bg-green-50 dark:bg-green-950/20 text-green-600 border-green-200 dark:border-green-800" :
                "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-800")}>
              {downloading === fmt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {fmt.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </div>

      <PeriodSelector
        state={ps} onChange={v => setPs(p => ({ ...p, ...v }))}
        projects={projectsData?.projects || []}
        selectedProject={projectId} onProjectChange={setProjectId}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20 mt-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Money Received", value: s.totalReceived || 0, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
              { label: "Total Spent", value: s.totalSpent || 0, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
              { label: "Balance", value: Math.abs((s.totalReceived || 0) - (s.totalSpent || 0)), icon: DollarSign, color: (s.totalReceived || 0) - (s.totalSpent || 0) >= 0 ? "text-blue-600" : "text-red-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
              { label: "Purchases", value: s.purchaseCount || 0, icon: Package, color: "text-primary", bg: "bg-primary/5", isCurrency: false },
            ].map(card => (
              <div key={card.label} className={cn("p-4 rounded-2xl border border-border", card.bg)}>
                <card.icon className={cn("w-5 h-5 mb-2", card.color)} />
                <p className={cn("text-xl font-bold font-display", card.color)}>
                  {(card as any).isCurrency === false ? card.value : formatCurrency(card.value as number)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Expense breakdown sub-totals */}
          {(breakdown.purchases || breakdown.utilities || breakdown.charges) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Purchases", value: breakdown.purchases || 0, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" },
                { label: "Utilities", value: breakdown.utilities || 0, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
                { label: "Site Charges", value: breakdown.charges || 0, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20" },
                { label: "Other Expenses", value: breakdown.otherExpenses || 0, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/20" },
              ].filter(x => x.value > 0).map(item => (
                <div key={item.label} className={cn("p-3 rounded-xl text-center border border-border", item.bg)}>
                  <p className={cn("font-bold text-sm", item.color)}>{formatCurrency(item.value)}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Balance note */}
          {(s.totalReceived || 0) > (s.totalSpent || 0) && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                💰 Balance Carried Forward: {formatCurrency((s.totalReceived || 0) - (s.totalSpent || 0))}
              </p>
              <p className="text-xs text-green-600 mt-0.5">Unspent funds from received money for this period</p>
            </div>
          )}

          {/* Per-project breakdown */}
          {projects.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Project Breakdown</h3>
              {projects.map((proj: any) => {
                const bal = proj.received - proj.spent;
                const pct = proj.received > 0 ? Math.round((proj.spent / proj.received) * 100) : 0;
                return (
                  <div key={proj.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold">{proj.name}</p>
                        <span className={cn("text-[10px]", proj.status === "ACTIVE" ? "badge-success" : "badge-warning")}>{proj.status}</span>
                      </div>
                      <p className={cn("text-sm font-bold", bal >= 0 ? "text-blue-600" : "text-red-500")}>
                        {bal >= 0 ? "Surplus" : "Deficit"}: {formatCurrency(Math.abs(bal))}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-xl">
                        <p className="text-[10px] text-muted-foreground">Received</p>
                        <p className="text-sm font-bold text-green-600">{formatCurrency(proj.received)}</p>
                      </div>
                      <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-xl">
                        <p className="text-[10px] text-muted-foreground">Spent</p>
                        <p className="text-sm font-bold text-red-500">{formatCurrency(proj.spent)}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded-xl">
                        <p className="text-[10px] text-muted-foreground">Purchases</p>
                        <p className="text-sm font-bold text-primary">{proj.purchaseCount}</p>
                      </div>
                    </div>
                    {proj.received > 0 && (
                      <div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : undefined }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{pct}% utilized</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {projects.length === 0 && (
            <div className="py-16 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">No data for the selected period</p>
              <p className="text-xs text-muted-foreground mt-1">Try selecting a different time period or project</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
