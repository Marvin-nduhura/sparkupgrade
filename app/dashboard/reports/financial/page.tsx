"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, Download, Loader2, Filter, Calendar } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function FinancialReportPage() {
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [downloading, setDownloading] = useState("");

  const { data: projectsData } = useQuery({ queryKey: ["projects-list"], queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); } });
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["financial-report", period, startDate, endDate, projectId],
    queryFn: async () => {
      const p = new URLSearchParams({ period });
      if (projectId) p.set("projectId", projectId);
      if (startDate) p.set("startDate", startDate);
      if (endDate) p.set("endDate", endDate);
      const r = await fetch(`/api/reports/summary?${p}`);
      return r.json();
    },
  });

  const handleDownload = async (fmt: string) => {
    setDownloading(fmt);
    try {
      const p = new URLSearchParams({ format: fmt, period });
      if (projectId) p.set("projectId", projectId);
      if (startDate) p.set("startDate", startDate);
      if (endDate) p.set("endDate", endDate);
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
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Financial Report</h1>
          <p className="text-sm text-muted-foreground">Detailed income &amp; expense analysis</p>
        </div>
        <div className="flex gap-2">
          {(["pdf","excel","word"] as const).map(fmt => (
            <motion.button key={fmt} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleDownload(fmt)} disabled={!!downloading}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                fmt==="pdf" ? "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-800" :
                fmt==="excel" ? "bg-green-50 dark:bg-green-950/20 text-green-600 border-green-200 dark:border-green-800" :
                "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-800")}>
              {downloading===fmt ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3"/>}
              {fmt.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-card border border-border rounded-2xl">
        <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input-styled flex-1 min-w-32">
          <option value="">All Projects</option>
          {(projectsData?.projects||[]).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {[["day","Today"],["week","Week"],["month","Month"],["year","Year"],["custom","Custom"]].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", period===v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
        {period==="custom" && <>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-styled text-sm" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-styled text-sm" />
        </>}
      </div>

      {isLoading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Received", value: s.totalReceived||0, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
              { label: "Total Spent", value: s.totalSpent||0, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
              { label: "Net Balance", value: (s.totalReceived||0)-(s.totalSpent||0), color: ((s.totalReceived||0)-(s.totalSpent||0))>=0?"text-blue-600":"text-red-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
              { label: "Transactions", value: s.purchaseCount||0, color: "text-primary", bg: "bg-primary/5", isCurrency: false },
            ].map(c => (
              <div key={c.label} className={cn("p-4 rounded-2xl border border-border", c.bg)}>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={cn("text-xl font-bold font-display mt-1", c.color)}>
                  {(c as any).isCurrency === false ? c.value : formatCurrency(c.value as number)}
                </p>
              </div>
            ))}
          </div>

          {/* Per project */}
          {projects.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">Project Breakdown</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full data-table">
                  <thead><tr>
                    <th className="text-left">Project</th><th className="text-right">Received</th>
                    <th className="text-right">Spent</th><th className="text-right">Balance</th>
                    <th className="text-right">Purchases</th><th className="text-center">Utilization</th>
                  </tr></thead>
                  <tbody>
                    {projects.map((proj: any) => {
                      const bal = proj.received - proj.spent;
                      const pct = proj.received > 0 ? Math.round((proj.spent/proj.received)*100) : 0;
                      return (
                        <tr key={proj.id} className="hover:bg-muted/20">
                          <td className="font-medium">{proj.name}</td>
                          <td className="text-right text-green-600 font-semibold">{formatCurrency(proj.received)}</td>
                          <td className="text-right text-red-500 font-semibold">{formatCurrency(proj.spent)}</td>
                          <td className={cn("text-right font-bold", bal>=0?"text-blue-600":"text-red-500")}>{formatCurrency(Math.abs(bal))}</td>
                          <td className="text-right">{proj.purchaseCount}</td>
                          <td className="text-center">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 progress-bar"><div className="progress-bar-fill" style={{ width:`${Math.min(pct,100)}%`, background: pct>90?"#ef4444":pct>70?"#f59e0b":"#22c55e" }}/></div>
                              <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted/30 font-bold">
                      <td>TOTAL</td>
                      <td className="text-right text-green-600">{formatCurrency(projects.reduce((s:number,p:any)=>s+p.received,0))}</td>
                      <td className="text-right text-red-500">{formatCurrency(projects.reduce((s:number,p:any)=>s+p.spent,0))}</td>
                      <td className={cn("text-right", (s.totalReceived||0)-(s.totalSpent||0)>=0?"text-blue-600":"text-red-500")}>{formatCurrency(Math.abs((s.totalReceived||0)-(s.totalSpent||0)))}</td>
                      <td className="text-right">{projects.reduce((s:number,p:any)=>s+p.purchaseCount,0)}</td>
                      <td/>
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
