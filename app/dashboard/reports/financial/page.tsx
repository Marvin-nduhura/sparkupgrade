"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, Download, Loader2, ArrowLeft } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PeriodSelector, usePeriodDates, type PeriodState } from "@/components/reports/period-selector";

export default function FinancialReportPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [ps, setPs] = useState<PeriodState>({
    period: "month", startDate: "", endDate: "",
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1).padStart(2, "0"),
  });
  const [downloading, setDownloading] = useState("");

  const { period: apiPeriod, startDate: apiStart, endDate: apiEnd } = usePeriodDates(ps);

  const { data: projectsData } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); },
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["financial-report", projectId, apiPeriod, apiStart, apiEnd],
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
      a.download = `financial-report-${Date.now()}.${fmt === "excel" ? "xlsx" : fmt === "word" ? "doc" : "html"}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${fmt.toUpperCase()}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setDownloading(""); }
  };

  const s = reportData?.summary || {};
  const projects = reportData?.projects || [];

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">Financial Report</h1>
          <p className="text-sm text-muted-foreground">Detailed income &amp; expense analysis</p>
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
        <div className="flex items-center justify-center py-20 mt-4"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6 mt-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Balance B/F", value: s.balanceBroughtForward || 0, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-900/30" },
              { label: "Total Received", value: s.totalReceived || 0, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
              { label: "Total Spent", value: s.totalSpent || 0, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
              { label: "Closing Balance", value: s.closingBalance || ((s.totalReceived || 0) - (s.totalSpent || 0)), color: ((s.closingBalance || (s.totalReceived || 0) - (s.totalSpent || 0))) >= 0 ? "text-blue-600" : "text-red-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
            ].map(c => (
              <div key={c.label} className={cn("p-4 rounded-2xl border border-border", c.bg)}>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={cn("text-xl font-bold font-display mt-1", c.color)}>{formatCurrency(c.value as number)}</p>
              </div>
            ))}
          </div>

          {/* Breakdown sub-totals */}
          {reportData?.breakdown && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: "Purchases", value: reportData.breakdown.purchases || 0, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" },
                { label: "Utilities", value: reportData.breakdown.utilities || 0, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
                { label: "Charges", value: reportData.breakdown.charges || 0, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20" },
                { label: "Other", value: reportData.breakdown.otherExpenses || 0, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/20" },
                { label: "Office", value: reportData.breakdown.officeExpenses || 0, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/20" },
              ].map(item => (
                <div key={item.label} className={cn("p-3 rounded-xl text-center border border-border", item.bg)}>
                  <p className={cn("font-bold text-sm", item.color)}>{formatCurrency(item.value)}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Project breakdown */}
          {projects.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">Project Breakdown</h3></div>
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
                    {projects.map((proj: any) => {
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
                    <tr className="bg-muted/30 font-bold">
                      <td>TOTAL</td>
                      <td className="text-right text-green-600">{formatCurrency(projects.reduce((s: number, p: any) => s + p.received, 0))}</td>
                      <td className="text-right text-red-500">{formatCurrency(projects.reduce((s: number, p: any) => s + p.spent, 0))}</td>
                      <td className={cn("text-right", (s.totalReceived || 0) - (s.totalSpent || 0) >= 0 ? "text-blue-600" : "text-red-500")}>{formatCurrency(Math.abs((s.totalReceived || 0) - (s.totalSpent || 0)))}</td>
                      <td className="text-right">{projects.reduce((s: number, p: any) => s + p.purchaseCount, 0)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
