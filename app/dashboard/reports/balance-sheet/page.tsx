"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Download, Loader2, TrendingUp, TrendingDown, DollarSign,
  ChevronDown, ChevronUp, Building2, MapPin, ArrowLeft
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { format, getYear, getMonth, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";
import { useRouter } from "next/navigation";

// Generate year options (current year back 5 years)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);
const MONTHS = [
  { value: 0, label: "January" }, { value: 1, label: "February" }, { value: 2, label: "March" },
  { value: 3, label: "April" }, { value: 4, label: "May" }, { value: 5, label: "June" },
  { value: 6, label: "July" }, { value: 7, label: "August" }, { value: 8, label: "September" },
  { value: 9, label: "October" }, { value: 10, label: "November" }, { value: 11, label: "December" },
];

function asOfFromSelectors(mode: "date" | "month" | "year", year: number, month: number, date: string): string {
  if (mode === "date") return date;
  if (mode === "month") {
    // last day of selected month
    const d = new Date(year, month + 1, 0); // day 0 = last day of prev month
    return format(d, "yyyy-MM-dd");
  }
  // year: Dec 31
  return `${year}-12-31`;
}

function ProjectBreakdownRow({ proj }: { proj: any }) {
  const [open, setOpen] = useState(false);
  const bal = proj.balance;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
          proj.status === "ACTIVE" ? "bg-green-500" : proj.status === "COMPLETED" ? "bg-blue-500" : "bg-amber-500")} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{proj.name}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <MapPin className="w-2.5 h-2.5" />{proj.location}
          </p>
        </div>
        <div className="text-right flex-shrink-0 mr-2">
          <p className={cn("font-bold text-sm", bal >= 0 ? "text-blue-600" : "text-red-500")}>
            {bal >= 0 ? "+" : ""}{formatCurrency(bal)}
          </p>
          <p className="text-[10px] text-muted-foreground">{bal >= 0 ? "surplus" : "deficit"}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-border bg-muted/20"
          >
            <div className="p-4 space-y-3">
              {/* Income vs Expenditure mini grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Money Received</p>
                  <p className="font-bold text-green-600">{formatCurrency(proj.received)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Total Spent</p>
                  <p className="font-bold text-red-500">{formatCurrency(proj.spent)}</p>
                </div>
              </div>

              {/* Detailed breakdown */}
              <div className="space-y-1.5">
                {[
                  { label: "Purchases", value: proj.purchases, color: "text-orange-600" },
                  { label: "Utilities", value: proj.utilities, color: "text-yellow-600" },
                  { label: "Site Charges", value: proj.charges, color: "text-purple-600" },
                  { label: "Other Expenses", value: proj.otherExp, color: "text-pink-600" },
                ].filter(r => r.value > 0).map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm px-1">
                    <span className="text-muted-foreground text-xs">{row.label}</span>
                    <span className={cn("font-semibold text-xs", row.color)}>{formatCurrency(row.value)}</span>
                  </div>
                ))}
                {proj.amountDue > 0 && (
                  <div className="flex items-center justify-between text-sm px-1 pt-1 border-t border-border">
                    <span className="text-amber-600 text-xs font-medium">⚠ Outstanding Dues</span>
                    <span className="font-bold text-xs text-amber-600">{formatCurrency(proj.amountDue)}</span>
                  </div>
                )}
              </div>

              {/* Utilization bar */}
              {proj.received > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Fund utilization</span>
                    <span>{Math.round((proj.spent / proj.received) * 100)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min((proj.spent / proj.received) * 100, 100)}%`,
                        background: proj.spent > proj.received ? "#ef4444" : proj.spent / proj.received > 0.8 ? "#f59e0b" : undefined,
                      }}
                    />
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

export default function BalanceSheetPage() {
  const router = useRouter();
  const today = new Date();
  const [mode, setMode] = useState<"date" | "month" | "year">("date");
  const [selectedYear, setSelectedYear] = useState(getYear(today));
  const [selectedMonth, setSelectedMonth] = useState(getMonth(today));
  const [asOfDate, setAsOfDate] = useState(format(today, "yyyy-MM-dd"));
  const [downloading, setDownloading] = useState("");

  const computedAsOf = asOfFromSelectors(mode, selectedYear, selectedMonth, asOfDate);

  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", computedAsOf],
    queryFn: async () => {
      const r = await fetch(`/api/reports/balance-sheet?asOf=${computedAsOf}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const handleDownload = async (fmt: string) => {
    setDownloading(fmt);
    try {
      const p = new URLSearchParams({ format: fmt, period: "year" });
      const res = await fetch(`/api/reports/download?${p}`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `balance-sheet-${computedAsOf}.${fmt === "excel" ? "xlsx" : fmt === "word" ? "doc" : "html"}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Balance sheet downloaded!");
    } catch (e: any) { toast.error(e.message); }
    finally { setDownloading(""); }
  };

  const bs = data?.balanceSheet || {};
  const projectBreakdowns: any[] = bs.projectBreakdowns || [];

  const modeLabel = mode === "year"
    ? `Year ${selectedYear}`
    : mode === "month"
    ? `${MONTHS[selectedMonth].label} ${selectedYear}`
    : formatDate(asOfDate);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">Company financial position — as at {modeLabel}</p>
        </div>
        <div className="flex gap-2">
          {(["pdf", "excel", "word"] as const).map(fmt => (
            <motion.button key={fmt} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => handleDownload(fmt)} disabled={!!downloading}
              className={cn("flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                fmt === "pdf" ? "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-800" :
                fmt === "excel" ? "bg-green-50 dark:bg-green-950/20 text-green-600 border-green-200 dark:border-green-800" :
                "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-800")}>
              {downloading === fmt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {fmt.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Date selectors */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-3">
        {/* Mode switcher */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {(["date", "month", "year"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {m === "date" ? "Specific Date" : m === "month" ? "By Month" : "By Year"}
            </button>
          ))}
        </div>

        {mode === "date" && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground">As of date:</label>
            <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)}
              className="input-styled text-sm max-w-48" />
          </div>
        )}

        {mode === "month" && (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-muted-foreground">Period:</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
              className="input-styled text-sm w-40">
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
              className="input-styled text-sm w-28">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">
              (shows cumulative position as at end of {MONTHS[selectedMonth].label} {selectedYear})
            </span>
          </div>
        )}

        {mode === "year" && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground">Year:</label>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
              className="input-styled text-sm w-28">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">(shows position as at 31 Dec {selectedYear})</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header card */}
          <div className="bg-gradient-brand rounded-2xl p-5 text-white text-center shadow-brand">
            <h2 className="text-lg font-display font-bold">Spark Construction Limited</h2>
            <p className="text-white/80 text-sm mt-1">Balance Sheet as at {modeLabel}</p>
            <p className="text-white/60 text-xs mt-0.5">{bs.projectCount || 0} projects · Figures in Uganda Shillings (UGX)</p>
          </div>

          {/* Income & Expenditure columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-green-50 dark:bg-green-950/20 border-b border-border flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <h3 className="font-bold text-green-700 dark:text-green-400">INCOME (Assets)</h3>
              </div>
              <div className="p-4 space-y-2">
                {(bs.income || []).map((row: any) => (
                  <div key={row.label} className={cn("flex justify-between py-1.5 text-sm",
                    row.isTotal && "border-t-2 border-green-200 dark:border-green-800 mt-2 pt-2 font-bold text-base")}>
                    <span className={row.isTotal ? "text-green-700 dark:text-green-400" : "text-muted-foreground pl-3"}>{row.label}</span>
                    <span className={row.isTotal ? "font-black text-green-600" : "font-medium"}>{formatCurrency(row.amount)}</span>
                  </div>
                ))}
                {(bs.income || []).length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-4">No income recorded</p>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-red-50 dark:bg-red-950/20 border-b border-border flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-red-600 dark:text-red-400">EXPENDITURE (Liabilities)</h3>
              </div>
              <div className="p-4 space-y-2">
                {(bs.expenditure || []).map((row: any) => (
                  <div key={row.label} className={cn("flex justify-between py-1.5 text-sm",
                    row.isTotal && "border-t-2 border-red-200 dark:border-red-800 mt-2 pt-2 font-bold text-base")}>
                    <span className={row.isTotal ? "text-red-600 dark:text-red-400" : row.isSubtotal ? "font-semibold text-amber-600" : "text-muted-foreground pl-3"}>{row.label}</span>
                    <span className={row.isTotal ? "font-black text-red-500" : row.isSubtotal ? "font-semibold text-amber-600" : "font-medium"}>{formatCurrency(row.amount)}</span>
                  </div>
                ))}
                {(bs.expenditure || []).length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-4">No expenditure recorded</p>
                )}
              </div>
            </div>
          </div>

          {/* Net position */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className={cn("rounded-2xl p-5 border-2 text-center",
              (bs.netPosition || 0) >= 0
                ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700"
                : "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700")}>
            <DollarSign className={cn("w-8 h-8 mx-auto mb-2", (bs.netPosition || 0) >= 0 ? "text-blue-600" : "text-red-500")} />
            <p className="text-sm text-muted-foreground mb-1">Net Position (Income – Expenditure)</p>
            <p className={cn("text-3xl font-black font-display", (bs.netPosition || 0) >= 0 ? "text-blue-600" : "text-red-500")}>
              {(bs.netPosition || 0) < 0 ? "-" : ""}{formatCurrency(Math.abs(bs.netPosition || 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {(bs.netPosition || 0) >= 0 ? "Surplus — Company is profitable" : "Deficit — Expenditure exceeds income"}
            </p>
          </motion.div>

          {/* Per-project breakdown */}
          {projectBreakdowns.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Project Breakdown</h3>
                <span className="text-xs text-muted-foreground ml-1">({projectBreakdowns.length} projects — click to expand)</span>
              </div>
              <div className="p-4 space-y-2">
                {projectBreakdowns
                  .sort((a, b) => Math.abs(b.received) - Math.abs(a.received))
                  .map(proj => (
                    <ProjectBreakdownRow key={proj.id} proj={proj} />
                  ))}

                {/* Totals row */}
                <div className="mt-3 p-3 bg-muted/30 rounded-xl grid grid-cols-3 gap-2 border border-border text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Received</p>
                    <p className="font-bold text-green-600 text-sm">{formatCurrency(projectBreakdowns.reduce((s, p) => s + p.received, 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Spent</p>
                    <p className="font-bold text-red-500 text-sm">{formatCurrency(projectBreakdowns.reduce((s, p) => s + p.spent, 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Net Balance</p>
                    <p className={cn("font-bold text-sm", projectBreakdowns.reduce((s, p) => s + p.balance, 0) >= 0 ? "text-blue-600" : "text-red-500")}>
                      {formatCurrency(projectBreakdowns.reduce((s, p) => s + p.balance, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-muted/30 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Notes</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>This balance sheet includes all transactions recorded up to and including {modeLabel}.</li>
              <li>Figures are in Uganda Shillings (UGX). All amounts are cumulative.</li>
              <li>Outstanding payables = purchase balances not yet fully paid.</li>
              <li>Click any project row to see its detailed income, expenditure and balance.</li>
              <li>This report is for internal management use only.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
