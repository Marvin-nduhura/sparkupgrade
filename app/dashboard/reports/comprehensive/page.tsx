"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, Loader2, ChevronDown, ChevronUp, Receipt,
  TrendingUp, TrendingDown, DollarSign, Package, Zap, AlertCircle,
  Building2, ArrowLeft, Sparkles, CreditCard
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";
import { PeriodSelector, usePeriodDates, type PeriodState } from "@/components/reports/period-selector";

function ReceiptIcon({ receipt, onView }: { receipt: any; onView: (url: string) => void }) {
  if (!receipt?.fileUrl) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onView(receipt.fileUrl); }}
      title={receipt.fileName || "View receipt"}
      className={cn(
        "inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-lg text-[10px] font-medium border transition-colors flex-shrink-0",
        receipt.aiVerified
          ? "bg-green-50 dark:bg-green-950/30 text-green-600 border-green-200 dark:border-green-800 hover:bg-green-100"
          : "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-100"
      )}>
      <Receipt className="w-2.5 h-2.5" />
      {receipt.aiVerified && <Sparkles className="w-2.5 h-2.5" />}
    </button>
  );
}

function CollapsiblePurchase({ purchase, onViewReceipt }: { purchase: any; onViewReceipt: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const isPaid = purchase.paymentStatus === "COMPLETED";
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Main row */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}>
        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isPaid ? "bg-green-500" : "bg-amber-500")} />
        <span className="flex-1 text-sm font-medium truncate">
          {purchase.project?.name} — {purchase.items?.map((i: any) => i.item?.name).filter(Boolean).join(", ") || "Purchase"}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(purchase.purchaseDate)}</span>
        <ReceiptIcon receipt={purchase.receipt} onView={onViewReceipt} />
        <span className="font-bold text-sm w-28 text-right">{formatCurrency(purchase.totalAmount)}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
      </div>

      {/* Expanded: items + installments */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            transition={{ duration: 0.18 }} className="overflow-hidden border-t border-border bg-muted/20">
            <div className="p-3 space-y-3">
              {/* Items */}
              {purchase.items?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Items Purchased</p>
                  <div className="space-y-1">
                    {purchase.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-xs px-2 py-1 bg-background rounded-lg">
                        <span>{item.item?.name}</span>
                        <span className="text-muted-foreground">{item.quantity} {item.item?.unit} × {formatCurrency(item.unitPrice)}</span>
                        <span className="font-semibold">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment summary */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-background rounded-lg p-2 text-center">
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-bold">{formatCurrency(purchase.totalAmount)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-2 text-center">
                  <p className="text-muted-foreground">Paid</p>
                  <p className="font-bold text-green-600">{formatCurrency(purchase.amountPaid)}</p>
                </div>
                <div className={cn("rounded-lg p-2 text-center", purchase.amountDue > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-background")}>
                  <p className="text-muted-foreground">Due</p>
                  <p className={cn("font-bold", purchase.amountDue > 0 ? "text-red-500" : "text-green-600")}>{formatCurrency(purchase.amountDue)}</p>
                </div>
              </div>

              {/* Installments */}
              {purchase.installments?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />Payment Installments ({purchase.installments.length})
                  </p>
                  <div className="space-y-1">
                    {purchase.installments.map((inst: any) => (
                      <div key={inst.id} className="flex items-center justify-between px-2 py-1.5 bg-green-50 dark:bg-green-950/20 rounded-lg text-xs">
                        <span className="text-muted-foreground">{formatDate(inst.paymentDate)}</span>
                        <span className="text-muted-foreground">{inst.paymentMethod?.replace(/_/g, " ")}</span>
                        {inst.verifiedByAi && <Sparkles className="w-3 h-3 text-blue-500" />}
                        <ReceiptIcon receipt={inst.receipt} onView={onViewReceipt} />
                        <span className="font-bold text-green-600">{formatCurrency(inst.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionTable({ title, icon: Icon, iconColor, items, columns, emptyText }: {
  title: string; icon: any; iconColor: string;
  items: any[]; columns: { key: string; label: string; render?: (item: any) => any; className?: string }[];
  emptyText?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className={cn("px-4 py-3 border-b border-border flex items-center justify-between", `bg-${iconColor}-50 dark:bg-${iconColor}-950/20`)}>
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", `text-${iconColor}-600`)} />
          <h3 className={cn("font-semibold text-sm", `text-${iconColor}-700 dark:text-${iconColor}-400`)}>{title}</h3>
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", `bg-${iconColor}-100 dark:bg-${iconColor}-900/40 text-${iconColor}-600`)}>{items.length}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead><tr>{columns.map(c => <th key={c.key} className={cn("text-left", c.className)}>{c.label}</th>)}</tr></thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id || i} className="hover:bg-muted/20">
                {columns.map(c => (
                  <td key={c.key} className={c.className}>
                    {c.render ? c.render(item) : item[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ComprehensiveReportPage() {
  const [ps, setPs] = useState<PeriodState>({
    period: "month", startDate: "", endDate: "",
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1).padStart(2, "0"),
  });
  const [projectId, setProjectId] = useState("");
  const [downloading, setDownloading] = useState("");
  const [viewReceiptUrl, setViewReceiptUrl] = useState("");
  const router = useRouter();

  const { period: apiPeriod, startDate: apiStart, endDate: apiEnd } = usePeriodDates(ps);

  const { data: projectsData } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); },
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ["comprehensive-report", projectId, apiPeriod, apiStart, apiEnd],
    queryFn: async () => {
      const p = new URLSearchParams({ period: apiPeriod });
      if (projectId) p.set("projectId", projectId);
      if (apiStart) p.set("startDate", apiStart);
      if (apiEnd) p.set("endDate", apiEnd);
      const r = await fetch(`/api/reports/comprehensive?${p}`);
      if (!r.ok) throw new Error("Failed to load report");
      return r.json();
    },
  });

  const handleDownload = async (fmt: "pdf" | "excel" | "word") => {
    setDownloading(fmt);
    try {
      const p = new URLSearchParams({ format: fmt, period: apiPeriod, type: "comprehensive" });
      if (projectId) p.set("projectId", projectId);
      if (apiStart) p.set("startDate", apiStart);
      if (apiEnd) p.set("endDate", apiEnd);
      const res = await fetch(`/api/reports/download?${p}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `comprehensive-report-${Date.now()}.${fmt === "excel" ? "xlsx" : fmt === "word" ? "doc" : "html"}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${fmt.toUpperCase()}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setDownloading(""); }
  };

  const s = report?.summary || {};
  const received = report?.received || [];
  const purchases = report?.purchases || [];
  const utilities = report?.utilities || [];
  const charges = report?.charges || [];
  const otherExpenses = report?.otherExpenses || [];
  const officeExpenses = report?.officeExpenses || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">Comprehensive Report</h1>
          <p className="text-sm text-muted-foreground">Full company-wide financial report with all transactions</p>
        </div>
        <div className="flex gap-2">
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
      <PeriodSelector
        state={ps} onChange={v => setPs(p => ({ ...p, ...v }))}
        projects={projectsData?.projects || []}
        selectedProject={projectId} onProjectChange={setProjectId}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6 mt-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Balance B/F", value: s.bbf || 0, icon: DollarSign, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-900/30" },
              { label: "Total Received", value: s.totalReceived || 0, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
              { label: "Total Spent", value: s.totalSpent || 0, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
              { label: "Closing Balance", value: s.closingBalance || 0, icon: DollarSign, color: (s.closingBalance || 0) >= 0 ? "text-blue-600" : "text-red-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
            ].map(stat => (
              <div key={stat.label} className={cn("p-4 rounded-2xl border border-border", stat.bg)}>
                <stat.icon className={cn("w-4 h-4 mb-1.5", stat.color)} />
                <p className={cn("text-xl font-bold font-display", stat.color)}>{formatCurrency(stat.value)}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Expense breakdown */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-semibold text-sm mb-3">Expenditure Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: "Purchases", value: s.totalPurchases || 0, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" },
                { label: "Utilities", value: s.totalUtilities || 0, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20" },
                { label: "Charges", value: s.totalCharges || 0, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20" },
                { label: "Other", value: s.totalOther || 0, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/20" },
                { label: "Office", value: s.totalOffice || 0, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/20" },
              ].map(item => (
                <div key={item.label} className={cn("p-3 rounded-xl text-center", item.bg)}>
                  <p className={cn("text-base font-bold", item.color)}>{formatCurrency(item.value)}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
            {(s.totalAmountDue || 0) > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm flex items-center justify-between">
                <span className="text-amber-700 dark:text-amber-400 font-medium">⚠ Outstanding Purchase Dues</span>
                <span className="font-bold text-amber-700">{formatCurrency(s.totalAmountDue)}</span>
              </div>
            )}
          </div>

          {/* Money Received */}
          <SectionTable
            title="Money Received"
            icon={TrendingUp}
            iconColor="green"
            items={received}
            columns={[
              { key: "receivedDate", label: "Date", render: (r: any) => formatDate(r.receivedDate) },
              { key: "project", label: "Project", render: (r: any) => r.project?.name },
              { key: "source", label: "Source" },
              { key: "paymentMethod", label: "Method", render: (r: any) => r.paymentMethod?.replace(/_/g, " ") },
              { key: "receivedBy", label: "Received By", render: (r: any) => r.receivedBy?.name },
              { key: "reference", label: "Ref", render: (r: any) => r.reference || "—" },
              { key: "receipt", label: "Receipt", render: (r: any) => <ReceiptIcon receipt={r.receipt} onView={setViewReceiptUrl} /> },
              { key: "amount", label: "Amount", className: "text-right font-bold text-green-600", render: (r: any) => formatCurrency(r.amount) },
            ]}
          />

          {/* Purchases with collapsible installments */}
          {purchases.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-orange-50 dark:bg-orange-950/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-sm text-orange-700 dark:text-orange-400">Purchases</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600">{purchases.length}</span>
                </div>
                <span className="font-bold text-sm text-orange-700">{formatCurrency(s.totalPurchases || 0)}</span>
              </div>
              <div className="p-3 space-y-2">
                {purchases.map((purchase: any) => (
                  <CollapsiblePurchase key={purchase.id} purchase={purchase} onViewReceipt={setViewReceiptUrl} />
                ))}
              </div>
            </div>
          )}

          {/* Utilities */}
          <SectionTable
            title="Utilities"
            icon={Zap}
            iconColor="yellow"
            items={utilities}
            columns={[
              { key: "usageDate", label: "Date", render: (r: any) => formatDate(r.usageDate) },
              { key: "project", label: "Project", render: (r: any) => r.project?.name },
              { key: "name", label: "Name" },
              { key: "category", label: "Category" },
              { key: "paymentMethod", label: "Method", render: (r: any) => r.paymentMethod?.replace(/_/g, " ") },
              { key: "receipt", label: "Receipt", render: (r: any) => <ReceiptIcon receipt={r.receipt} onView={setViewReceiptUrl} /> },
              { key: "amount", label: "Amount", className: "text-right font-bold text-red-500", render: (r: any) => formatCurrency(r.amount) },
            ]}
          />

          {/* Site Charges */}
          <SectionTable
            title="Site Charges"
            icon={AlertCircle}
            iconColor="purple"
            items={charges}
            columns={[
              { key: "chargeDate", label: "Date", render: (r: any) => formatDate(r.chargeDate) },
              { key: "project", label: "Project", render: (r: any) => r.project?.name },
              { key: "name", label: "Name" },
              { key: "category", label: "Category" },
              { key: "paymentMethod", label: "Method", render: (r: any) => r.paymentMethod?.replace(/_/g, " ") },
              { key: "receipt", label: "Receipt", render: (r: any) => <ReceiptIcon receipt={r.receipt} onView={setViewReceiptUrl} /> },
              { key: "amount", label: "Amount", className: "text-right font-bold text-red-500", render: (r: any) => formatCurrency(r.amount) },
            ]}
          />

          {/* Other Expenses */}
          <SectionTable
            title="Other Expenses"
            icon={FileText}
            iconColor="pink"
            items={otherExpenses}
            columns={[
              { key: "expenseDate", label: "Date", render: (r: any) => formatDate(r.expenseDate) },
              { key: "project", label: "Project", render: (r: any) => r.project?.name },
              { key: "name", label: "Name" },
              { key: "category", label: "Category" },
              { key: "paymentMethod", label: "Method", render: (r: any) => r.paymentMethod?.replace(/_/g, " ") },
              { key: "receipt", label: "Receipt", render: (r: any) => <ReceiptIcon receipt={r.receipt} onView={setViewReceiptUrl} /> },
              { key: "amount", label: "Amount", className: "text-right font-bold text-red-500", render: (r: any) => formatCurrency(r.amount) },
            ]}
          />

          {/* Office Expenses */}
          <SectionTable
            title="Office Expenses"
            icon={Building2}
            iconColor="cyan"
            items={officeExpenses}
            columns={[
              { key: "expenseDate", label: "Date", render: (r: any) => formatDate(r.expenseDate) },
              { key: "user", label: "By", render: (r: any) => r.user?.name },
              { key: "name", label: "Name" },
              { key: "category", label: "Category" },
              { key: "paymentMethod", label: "Method", render: (r: any) => r.paymentMethod?.replace(/_/g, " ") },
              { key: "receipt", label: "Receipt", render: (r: any) => <ReceiptIcon receipt={r.receipt} onView={setViewReceiptUrl} /> },
              { key: "amount", label: "Amount", className: "text-right font-bold text-red-500", render: (r: any) => formatCurrency(r.amount) },
            ]}
          />

          {/* Grand Total Footer */}
          <div className="bg-gradient-brand rounded-2xl p-5 text-white shadow-brand">
            <h3 className="font-bold text-lg mb-3">Report Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div><p className="text-white/70 text-xs mb-1">Balance B/F</p><p className="text-xl font-black">{formatCurrency(s.bbf || 0)}</p></div>
              <div><p className="text-white/70 text-xs mb-1">+ Received</p><p className="text-xl font-black">{formatCurrency(s.totalReceived || 0)}</p></div>
              <div><p className="text-white/70 text-xs mb-1">− Spent</p><p className="text-xl font-black">{formatCurrency(s.totalSpent || 0)}</p></div>
              <div className={cn("rounded-xl p-2", (s.closingBalance || 0) >= 0 ? "bg-white/20" : "bg-red-500/40")}>
                <p className="text-white/70 text-xs mb-1">Closing Balance</p>
                <p className="text-2xl font-black">{formatCurrency(Math.abs(s.closingBalance || 0))}</p>
                <p className="text-[10px] text-white/60">{(s.closingBalance || 0) >= 0 ? "Surplus" : "Deficit"}</p>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {received.length === 0 && purchases.length === 0 && utilities.length === 0 && (
            <div className="py-20 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">No transactions found for this period</p>
              <p className="text-xs text-muted-foreground mt-1">Try changing the date range or project filter</p>
            </div>
          )}
        </div>
      )}

      {viewReceiptUrl && <ReceiptViewModal url={viewReceiptUrl} onClose={() => setViewReceiptUrl("")} />}
    </div>
  );
}
