"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Download, Calendar, Loader2, TrendingUp, TrendingDown, DollarSign, Package, ClipboardList } from "lucide-react";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

const PERIODS = [
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

export default function SiteManagerReportPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState("day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [downloading, setDownloading] = useState("");

  const { data: projectsData } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); },
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ["site-report", period, startDate, endDate, projectId],
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
      a.download = `site-report-${period}-${Date.now()}.${fmt === "excel" ? "xlsx" : fmt === "word" ? "doc" : "html"}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Report downloaded!");
    } catch (e: any) { toast.error(e.message); }
    finally { setDownloading(""); }
  };

  const s = report?.summary || {};
  const projects = report?.projects || [];

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold">My Reports</h1>
          <p className="text-sm text-muted-foreground">Daily, weekly &amp; custom reports for your sites</p>
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
        {/* Period selector */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", period===p.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Project filter */}
        <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input-styled flex-1 min-w-40">
          <option value="">All My Projects</option>
          {(projectsData?.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {period === "custom" && (
          <div className="flex gap-2 flex-wrap">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-styled text-sm" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-styled text-sm" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Money Received", value: s.totalReceived||0, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
              { label: "Total Spent", value: s.totalSpent||0, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
              { label: "Balance", value: Math.abs((s.totalReceived||0)-(s.totalSpent||0)), icon: DollarSign, color: (s.totalReceived||0)-(s.totalSpent||0)>=0?"text-blue-600":"text-red-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
              { label: "Purchases", value: s.purchaseCount||0, icon: Package, color: "text-primary", bg: "bg-primary/5", isCurrency: false },
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

          {/* Balance note */}
          {(s.totalReceived||0) > (s.totalSpent||0) && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                💰 Balance Carried Forward: {formatCurrency((s.totalReceived||0)-(s.totalSpent||0))}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                Unspent funds from received money for this period
              </p>
            </div>
          )}

          {/* Per project breakdown */}
          {projects.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Project Breakdown</h3>
              {projects.map((proj: any) => {
                const bal = proj.received - proj.spent;
                const pct = proj.received > 0 ? Math.round((proj.spent/proj.received)*100) : 0;
                return (
                  <div key={proj.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold">{proj.name}</p>
                        <span className={cn("text-[10px]", proj.status==="ACTIVE"?"badge-success":"badge-warning")}>{proj.status}</span>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", bal>=0?"text-blue-600":"text-red-500")}>
                          {bal>=0?"Surplus":"Deficit"}: {formatCurrency(Math.abs(bal))}
                        </p>
                      </div>
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
                          <div className="progress-bar-fill" style={{ width:`${Math.min(pct,100)}%`, background: pct>90?"#ef4444":pct>70?"#f59e0b":undefined }} />
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
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20"/>
              <p className="text-muted-foreground">No data for the selected period</p>
              <p className="text-xs text-muted-foreground mt-1">Try selecting a different time period or project</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
