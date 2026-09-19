"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Download, BarChart3, TrendingUp, Loader2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ExpenseBreakdownChart } from "@/components/charts/expense-breakdown-chart";
import { PeriodSelector, usePeriodDates, type PeriodState } from "@/components/reports/period-selector";

export default function ReportsPage() {
  const [selectedProject, setSelectedProject] = useState("");
  const [ps, setPs] = useState<PeriodState>({
    period: "month", startDate: "", endDate: "",
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1).padStart(2, "0"),
  });
  const [downloading, setDownloading] = useState<string>("");

  const { period: apiPeriod, startDate: apiStart, endDate: apiEnd } = usePeriodDates(ps);

  const { data: projectsData } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); },
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["report", selectedProject, apiPeriod, apiStart, apiEnd],
    queryFn: async () => {
      const p = new URLSearchParams({ period: apiPeriod });
      if (selectedProject) p.set("projectId", selectedProject);
      if (apiStart) p.set("startDate", apiStart);
      if (apiEnd) p.set("endDate", apiEnd);
      const r = await fetch(`/api/reports/summary?${p}`);
      return r.json();
    },
  });

  const handleDownload = async (fmt: "pdf" | "excel" | "word") => {
    setDownloading(fmt);
    try {
      const p = new URLSearchParams({ format: fmt, period: apiPeriod });
      if (selectedProject) p.set("projectId", selectedProject);
      if (apiStart) p.set("startDate", apiStart);
      if (apiEnd) p.set("endDate", apiEnd);
      const res = await fetch(`/api/reports/download?${p}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${Date.now()}.${fmt === "excel" ? "xlsx" : fmt === "word" ? "doc" : "html"}`;
      a.click(); window.URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${fmt.toUpperCase()}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setDownloading(""); }
  };

  const summary = reportData?.summary || {};

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Financial &amp; project performance overview</p>
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
        selectedProject={selectedProject} onProjectChange={setSelectedProject}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 mb-6">
        {[
          { label: "Total Received", value: summary.totalReceived || 0, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
          { label: "Total Spent", value: summary.totalSpent || 0, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
          { label: "Net Balance", value: (summary.totalReceived || 0) - (summary.totalSpent || 0), color: ((summary.totalReceived || 0) - (summary.totalSpent || 0)) >= 0 ? "text-blue-600" : "text-red-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
          { label: "Purchases", value: summary.purchaseCount || 0, color: "text-primary", bg: "bg-primary/5", isCurrency: false },
        ].map(stat => (
          <div key={stat.label} className={cn("p-4 rounded-2xl border border-border", stat.bg)}>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn("text-xl font-bold font-display mt-1", stat.color)}>
              {stat.isCurrency === false ? String(stat.value) : formatCurrency(Number(stat.value))}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
          <h3 className="font-display font-semibold mb-4">Revenue vs Expenses</h3>
          <RevenueChart />
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
          <h3 className="font-display font-semibold mb-4">Expense Breakdown</h3>
          <ExpenseBreakdownChart projectId={selectedProject} />
        </div>
      </div>

      {/* Project breakdown table */}
      {reportData?.projects?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border"><h3 className="font-semibold">Project Breakdown</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead><tr>
                <th className="text-left">Project</th>
                <th className="text-right">Received</th>
                <th className="text-right">Spent</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Purchases</th>
                <th className="text-center">Utilization</th>
              </tr></thead>
              <tbody>
                {reportData.projects.map((proj: any) => {
                  const bal = proj.received - proj.spent;
                  const pct = proj.received > 0 ? Math.round((proj.spent / proj.received) * 100) : 0;
                  return (
                    <tr key={proj.id} className="hover:bg-muted/20">
                      <td className="font-medium">{proj.name}</td>
                      <td className="text-right text-green-600 font-semibold">{formatCurrency(proj.received)}</td>
                      <td className="text-right text-red-500 font-semibold">{formatCurrency(proj.spent)}</td>
                      <td className={cn("text-right font-bold", bal >= 0 ? "text-blue-600" : "text-red-500")}>{formatCurrency(Math.abs(bal))}</td>
                      <td className="text-right">{proj.purchaseCount}</td>
                      <td className="text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#22c55e" }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
