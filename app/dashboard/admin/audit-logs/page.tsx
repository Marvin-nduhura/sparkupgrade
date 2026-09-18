"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Search, Filter, ChevronLeft, ChevronRight, Eye, Download } from "lucide-react";
import { cn, formatDateTime, getInitials, getAvatarColor, getAuditActionLabel } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "badge-success", UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
  DELETE: "badge-error", LOGIN: "badge-info", LOGOUT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-medium",
  APPROVE: "badge-success", REJECT: "badge-error", ASSIGN: "badge-brand", UNASSIGN: "badge-warning",
  SEND_MONEY: "badge-success", VIEW: "badge-info", DOWNLOAD: "badge-info", UPLOAD: "badge-success",
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", debouncedSearch, action, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (action) params.set("action", action);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/audit-logs?${params}`);
      if (!res.ok) throw new Error("Failed to load audit logs");
      return res.json();
    },
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  const ACTIONS = ["CREATE","UPDATE","DELETE","LOGIN","LOGOUT","APPROVE","REJECT","ASSIGN","SEND_MONEY","UPLOAD","DOWNLOAD"];

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} activity records</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-xs text-muted-foreground">All system activity is recorded</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user or resource..." className="input-styled pl-10" />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-muted p-1 rounded-xl flex-shrink-0">
          <button onClick={() => setAction("")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", !action ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>All</button>
          {ACTIONS.map(a => (
            <button key={a} onClick={() => setAction(a)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", action === a ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {a.charAt(0) + a.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr>
              <th className="text-left">When</th>
              <th className="text-left">User</th>
              <th className="text-center">Action</th>
              <th className="text-left">Resource</th>
              <th className="text-left">Project</th>
              <th className="text-left">Details</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-5 m-2 rounded" /></td></tr>)
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" />
                  <p className="text-sm text-muted-foreground">No audit logs found</p>
                </td></tr>
              ) : logs.map((log: any, i: number) => (
                <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td>
                    {log.user ? (
                      <div className="flex items-center gap-2">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0", getAvatarColor(log.user.name))}>
                          {getInitials(log.user.name)}
                        </div>
                        <span className="text-sm font-medium whitespace-nowrap">{log.user.name}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">System</span>}
                  </td>
                  <td className="text-center">
                    <span className={cn("text-[10px]", ACTION_COLORS[log.action] || "badge-info")}>
                      {getAuditActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="text-sm">{log.resource}{log.resourceId && <span className="text-muted-foreground text-xs ml-1">#{log.resourceId.slice(-6)}</span>}</td>
                  <td className="text-xs text-muted-foreground">{log.project?.name || "—"}</td>
                  <td className="text-xs text-muted-foreground max-w-xs">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <span title={JSON.stringify(log.details)} className="cursor-help truncate block max-w-[160px]">
                        {Object.entries(log.details as Record<string, any>).slice(0, 2).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(", ")}
                      </span>
                    ) : "—"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
