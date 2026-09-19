"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, Loader2, TrendingUp, TrendingDown,
  Package, Zap, AlertCircle, Calendar, ArrowLeft, ChevronDown, ChevronUp,
  DollarSign, RefreshCw, Receipt
} from "lucide-react";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";

export default function DailyReportPage() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState("");
  const [downloading, setDownloading] = useState("");
  const [viewReceiptUrl, setViewReceiptUrl] = useState("");
  const router = useRouter();

  const { data: projectsData } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); },
  });

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["daily-report", reportDate, projectId],
    queryFn: async () => {
      const p = new URLSearchParams({ date: reportDate });
      if (projectId) p.set("projectId", projectId);
      const r = await fetch(`/api/reports/daily?${p}`);
      if (!r.ok) throw new Error("Failed to load daily report");
      return r.json();
    },
  });

  const handleDownload = async (fmt: "pdf" | "excel" | "word") => {
    setDownloading(fmt);
    try {
      const p = new URLSearchParams({ format: fmt, period: "day", startDate: reportDate, type: "daily" });
      if (projectId) p.set("projectId", projectId);
      const res = await fetch(`/api/reports/download?${p}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `daily-report-${reportDate}.${fmt === "excel" ? "xlsx" : fmt === "word" ? "doc" : "html"}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`Daily report downloaded as ${fmt.toUpperCase()}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setDownloading(""); }
  };

  const summary = report?.summary || {};
  const projectReports = report?.projects || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">Daily Report</h1>
          <p className="text-sm text-muted-foreground">Site activity for {format(new Date(reportDate + "T00:00:00"), "EEEE, dd MMM yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-2 hover:bg-muted rounded-xl transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          {(["pdf", "excel", "word"] as const).map(fmt => (
            <motion.button key={fmt} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => handleDownload(fmt)} disabled={!!downloading}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
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
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
            className="input-styled text-sm" max={new Date().toISOString().split("T")[0]} />
        </div>
        <select value={projectId} onChange={e => setProjectId(e.target.value)} className="input-styled flex-1 min-w-40">
          <option value="">All My Projects</option>
          {(projectsData?.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : projectReports.length === 0 ? (
        <div className="py-20 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
          <p className="text-muted-foreground font-medium">No activity on this date</p>
          <p className="text-xs text-muted-foreground mt-1">No transactions or usage records found for {format(new Date(reportDate + "T00:00:00"), "dd MMM yyyy")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Day summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Received", value: summary.totalReceived || 0, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
              { label: "Total Spent", value: summary.totalSpent || 0, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
              { label: "Items Used", value: summary.totalUsage || 0, icon: Package, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20", isCurrency: false },
            ].map(card => (
              <div key={card.label} className={cn("p-4 rounded-2xl border border-border text-center", card.bg)}>
                <card.icon className={cn("w-5 h-5 mx-auto mb-1", card.color)} />
                <p className={cn("text-xl font-bold font-display", card.color)}>
                  {(card as any).isCurrency === false ? card.value : formatCurrency(card.value as number)}
                </p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Per-project sections */}
          {projectReports.map((pr: any) => (
            <ProjectDaySection key={pr.project.id} projectReport={pr} onViewReceipt={setViewReceiptUrl} />
          ))}
        </div>
      )}

      {viewReceiptUrl && <ReceiptViewModal url={viewReceiptUrl} onClose={() => setViewReceiptUrl("")} />}
    </div>
  );
}

function ProjectDaySection({ projectReport: pr, onViewReceipt }: { projectReport: any; onViewReceipt: (url: string) => void }) {
  const [sections, setSections] = useState({ received: true, purchases: true, utilities: false, charges: false, other: false, usage: true });
  const toggle = (key: keyof typeof sections) => setSections(s => ({ ...s, [key]: !s[key] }));
  const { project, received, purchases, utilities, charges, otherExpenses, usageRecords, totals } = pr;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Project header */}
      <div className="px-4 py-3 bg-gradient-brand text-white flex items-center justify-between">
        <div>
          <h3 className="font-bold">{project.name}</h3>
          <p className="text-white/70 text-xs">{project.location}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/70">Balance</p>
          <p className={cn("text-lg font-black", totals.received - totals.spent >= 0 ? "" : "text-red-300")}>
            {formatCurrency(Math.abs(totals.received - totals.spent))}
            <span className="text-xs text-white/70 ml-1">{totals.received - totals.spent >= 0 ? "surplus" : "deficit"}</span>
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Money Received */}
        {received.length > 0 && (
          <Collapsible
            open={sections.received}
            onToggle={() => toggle("received")}
            title="Money Received"
            icon={TrendingUp}
            count={received.length}
            total={totals.received}
            totalColor="text-green-600">
            <div className="space-y-1.5">
              {received.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded-xl">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.source}</p>
                    <p className="text-xs text-muted-foreground">{r.paymentMethod?.replace(/_/g, " ")} • {r.receivedBy?.name}</p>
                  </div>
                  {r.receipt?.fileUrl && (
                    <button onClick={() => onViewReceipt(r.receipt.fileUrl)} className="p-1 hover:bg-green-100 rounded-lg transition-colors">
                      <Receipt className="w-3.5 h-3.5 text-green-600" />
                    </button>
                  )}
                  <span className="font-bold text-green-600 flex-shrink-0">{formatCurrency(r.amount)}</span>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* Purchases */}
        {purchases.length > 0 && (
          <Collapsible
            open={sections.purchases}
            onToggle={() => toggle("purchases")}
            title="Purchases"
            icon={Package}
            count={purchases.length}
            total={totals.purchases}
            totalColor="text-orange-600">
            <div className="space-y-2">
              {purchases.map((p: any) => (
                <div key={p.id} className="p-2.5 bg-orange-50 dark:bg-orange-950/20 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{p.items?.map((i: any) => i.item?.name).filter(Boolean).join(", ") || "Purchase"}</p>
                    <div className="flex items-center gap-1.5">
                      {p.receipt?.fileUrl && (
                        <button onClick={() => onViewReceipt(p.receipt.fileUrl)} className="p-1 hover:bg-orange-100 rounded-lg transition-colors">
                          <Receipt className="w-3.5 h-3.5 text-orange-600" />
                        </button>
                      )}
                      <span className="font-bold text-orange-600 text-sm">{formatCurrency(p.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>By: {p.purchasedBy?.name}</span>
                    <span className={cn("font-medium", p.amountDue > 0 ? "text-red-500" : "text-green-600")}>
                      {p.amountDue > 0 ? `Due: ${formatCurrency(p.amountDue)}` : "Fully paid"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* Utilities */}
        {utilities.length > 0 && (
          <Collapsible
            open={sections.utilities}
            onToggle={() => toggle("utilities")}
            title="Utilities"
            icon={Zap}
            count={utilities.length}
            total={totals.utilities}
            totalColor="text-yellow-600">
            <div className="space-y-1.5">
              {utilities.map((u: any) => (
                <div key={u.id} className="flex items-center gap-2 text-sm p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl">
                  <div className="flex-1"><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.category}</p></div>
                  {u.receipt?.fileUrl && <button onClick={() => onViewReceipt(u.receipt.fileUrl)} className="p-1 rounded-lg"><Receipt className="w-3.5 h-3.5 text-yellow-600" /></button>}
                  <span className="font-bold text-red-500">{formatCurrency(u.amount)}</span>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* Site Charges */}
        {charges.length > 0 && (
          <Collapsible
            open={sections.charges}
            onToggle={() => toggle("charges")}
            title="Site Charges"
            icon={AlertCircle}
            count={charges.length}
            total={totals.charges}
            totalColor="text-purple-600">
            <div className="space-y-1.5">
              {charges.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 text-sm p-2 bg-purple-50 dark:bg-purple-950/20 rounded-xl">
                  <div className="flex-1"><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.category}</p></div>
                  {c.receipt?.fileUrl && <button onClick={() => onViewReceipt(c.receipt.fileUrl)} className="p-1 rounded-lg"><Receipt className="w-3.5 h-3.5 text-purple-600" /></button>}
                  <span className="font-bold text-red-500">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* Other Expenses */}
        {otherExpenses.length > 0 && (
          <Collapsible
            open={sections.other}
            onToggle={() => toggle("other")}
            title="Other Expenses"
            icon={FileText}
            count={otherExpenses.length}
            total={totals.other}
            totalColor="text-pink-600">
            <div className="space-y-1.5">
              {otherExpenses.map((o: any) => (
                <div key={o.id} className="flex items-center gap-2 text-sm p-2 bg-pink-50 dark:bg-pink-950/20 rounded-xl">
                  <div className="flex-1"><p className="font-medium">{o.name}</p><p className="text-xs text-muted-foreground">{o.category}</p></div>
                  {o.receipt?.fileUrl && <button onClick={() => onViewReceipt(o.receipt.fileUrl)} className="p-1 rounded-lg"><Receipt className="w-3.5 h-3.5 text-pink-600" /></button>}
                  <span className="font-bold text-red-500">{formatCurrency(o.amount)}</span>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* Inventory Usage */}
        {usageRecords.length > 0 && (
          <Collapsible
            open={sections.usage}
            onToggle={() => toggle("usage")}
            title="Inventory Usage"
            icon={Package}
            count={usageRecords.length}
            badge={`${usageRecords.filter((u: any) => u.type === "USE").length} used, ${usageRecords.filter((u: any) => u.type === "RESTOCK").length} restocked`}>
            <div className="space-y-1.5">
              {usageRecords.map((u: any) => (
                <div key={u.id} className={cn("flex items-center gap-2 text-sm p-2 rounded-xl",
                  u.type === "USE" ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20")}>
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", u.type === "USE" ? "bg-red-500" : "bg-green-500")} />
                  <div className="flex-1">
                    <p className="font-medium">{u.item?.name}</p>
                    {u.description && <p className="text-xs text-muted-foreground">{u.description}</p>}
                  </div>
                  <span className={cn("font-semibold text-xs px-2 py-0.5 rounded-full",
                    u.type === "USE" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                    {u.type === "USE" ? "-" : "+"}{u.quantity} {u.item?.unit}
                  </span>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* Day totals */}
        <div className="mt-2 p-3 bg-muted/30 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm border border-border">
          <div><p className="text-xs text-muted-foreground">Received</p><p className="font-bold text-green-600">{formatCurrency(totals.received)}</p></div>
          <div><p className="text-xs text-muted-foreground">Spent</p><p className="font-bold text-red-500">{formatCurrency(totals.spent)}</p></div>
          <div><p className="text-xs text-muted-foreground">Items Used</p><p className="font-bold text-orange-600">{totals.usageItems}</p></div>
          <div><p className="text-xs text-muted-foreground">Restocked</p><p className="font-bold text-green-600">{totals.restockItems}</p></div>
        </div>
      </div>
    </div>
  );
}

function Collapsible({ open, onToggle, title, icon: Icon, count, total, totalColor, badge, children }: {
  open: boolean; onToggle: () => void; title: string; icon: any;
  count: number; total?: number; totalColor?: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left">
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-sm font-semibold">{title}</span>
        {badge && <span className="text-xs text-muted-foreground">{badge}</span>}
        {total !== undefined && totalColor && (
          <span className={cn("font-bold text-sm", totalColor)}>{formatCurrency(total)}</span>
        )}
        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{count}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            transition={{ duration: 0.15 }} className="overflow-hidden border-t border-border">
            <div className="p-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


