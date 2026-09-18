"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText, Download, BarChart3, TrendingUp, Building2,
  Calendar, Filter, Loader2, BookOpen, ChevronDown
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ProjectStatusChart } from "@/components/charts/project-status-chart";
import { ExpenseBreakdownChart } from "@/components/charts/expense-breakdown-chart";

export default function ReportsPage() {
  const [selectedProject, setSelectedProject] = useState("");
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloading, setDownloading] = useState<string>("");

  const { data: projectsData } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => { const res = await fetch("/api/projects?limit=50"); return res.json(); },
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["report", selectedProject, period, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (selectedProject) params.set("projectId", selectedProject);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/reports/summary?${params}`);
      return res.json();
    },
  });

  const handleDownload = async (format: "pdf" | "excel" | "word") => {
    setDownloading(format);
    try {
      const params = new URLSearchParams({ format, period });
      if (selectedProject) params.set("projectId", selectedProject);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/reports/download?${params}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buildspark-report-${Date.now()}.${format === "excel" ? "xlsx" : format === "word" ? "docx" : "pdf"}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Report downloaded as ${format.toUpperCase()}!`);
    } catch (e: any) { toast.error(e.message || "Download failed"); }
    finally { setDownloading(""); }
  };

  const summary = reportData?.summary || {};

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Financial & project performance reports</p>
        </div>
        {/* Download buttons */}
        <div className="flex gap-2">
          {(["pdf", "excel", "word"] as const).map(fmt => (
            <motion.button key={fmt} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleDownload(fmt)}
              disabled={!!downloading} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                fmt === "pdf" ? "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-800 hover:bg-red-100" :
                fmt === "excel" ? "bg-green-50 dark:bg-green-950/20 text-green-600 border-green-200 dark:border-green-800 hover:bg-green-100" :
                "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-100")}>
              {downloading === fmt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {fmt.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-card border border-border rounded-2xl">
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="input-styled flex-1 min-w-32">
          <option value="">All Projects</option>
          {(projectsData?.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {[["day","Today"],["week","Week"],["month","Month"],["year","Year"],["custom","Custom"]].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap", period === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {l}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-styled text-sm" placeholder="Start date" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-styled text-sm" placeholder="End date" />
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Received", value: summary.totalReceived || 0, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
          { label: "Total Spent", value: summary.totalSpent || 0, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
          { label: "Net Balance", value: (summary.totalReceived || 0) - (summary.totalSpent || 0), color: ((summary.totalReceived || 0) - (summary.totalSpent || 0)) >= 0 ? "text-blue-600" : "text-red-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
          { label: "Total Purchases", value: summary.purchaseCount || 0, color: "text-primary", bg: "bg-primary/5", isCurrency: false },
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

      {/* Project-level breakdown */}
      {reportData?.projects?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6">
          <h3 className="font-display font-semibold mb-4">Project Breakdown</h3>
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
                  const balance = proj.received - proj.spent;
                  const pct = proj.received > 0 ? Math.round((proj.spent / proj.received) * 100) : 0;
                  return (
                    <tr key={proj.id} className="hover:bg-muted/20">
                      <td className="font-medium">{proj.name}</td>
                      <td className="text-right text-green-600 font-semibold">{formatCurrency(proj.received)}</td>
                      <td className="text-right text-red-500 font-semibold">{formatCurrency(proj.spent)}</td>
                      <td className={cn("text-right font-bold", balance >= 0 ? "text-blue-600" : "text-red-500")}>{formatCurrency(Math.abs(balance))}</td>
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
