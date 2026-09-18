"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Download, Loader2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [downloading, setDownloading] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["balance-sheet", asOfDate],
    queryFn: async () => {
      const r = await fetch(`/api/reports/balance-sheet?asOf=${asOfDate}`);
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
      a.download = `balance-sheet-${asOfDate}.${fmt==="excel"?"xlsx":fmt==="word"?"doc":"html"}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Balance sheet downloaded!");
    } catch (e: any) { toast.error(e.message); }
    finally { setDownloading(""); }
  };

  const bs = data?.balanceSheet || {};

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground">Company financial position summary</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={asOfDate} onChange={e=>setAsOfDate(e.target.value)} className="input-styled text-sm" />
          <div className="flex gap-2">
            {(["pdf","excel","word"] as const).map(fmt => (
              <motion.button key={fmt} whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={()=>handleDownload(fmt)} disabled={!!downloading}
                className={cn("flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                  fmt==="pdf"?"bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-800":
                  fmt==="excel"?"bg-green-50 dark:bg-green-950/20 text-green-600 border-green-200 dark:border-green-800":
                  "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-800")}>
                {downloading===fmt?<Loader2 className="w-3 h-3 animate-spin"/>:<Download className="w-3 h-3"/>}
                {fmt.toUpperCase()}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div> : (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-gradient-brand rounded-2xl p-5 text-white text-center shadow-brand">
            <h2 className="text-lg font-display font-bold">Spark Construction Limited</h2>
            <p className="text-white/80 text-sm">Balance Sheet as at {formatDate(asOfDate)}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ASSETS / INCOME */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-green-50 dark:bg-green-950/20 border-b border-border flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600"/>
                <h3 className="font-bold text-green-700 dark:text-green-400">INCOME (Assets)</h3>
              </div>
              <div className="p-4 space-y-2">
                {(bs.income||[]).map((row: any) => (
                  <div key={row.label} className={cn("flex justify-between py-1.5 text-sm", row.isTotal && "border-t-2 border-green-200 dark:border-green-800 mt-2 pt-2 font-bold text-base")}>
                    <span className={row.isTotal?"text-green-700 dark:text-green-400":row.isSubtotal?"font-semibold":"text-muted-foreground pl-3"}>{row.label}</span>
                    <span className={row.isTotal?"font-black text-green-600":"font-medium"}>{formatCurrency(row.amount)}</span>
                  </div>
                ))}
                {(bs.income||[]).length === 0 && (
                  <div className="py-4 text-center text-sm text-muted-foreground">No income data</div>
                )}
              </div>
            </div>

            {/* EXPENDITURE / LIABILITIES */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-red-50 dark:bg-red-950/20 border-b border-border flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500"/>
                <h3 className="font-bold text-red-600 dark:text-red-400">EXPENDITURE (Liabilities)</h3>
              </div>
              <div className="p-4 space-y-2">
                {(bs.expenditure||[]).map((row: any) => (
                  <div key={row.label} className={cn("flex justify-between py-1.5 text-sm", row.isTotal && "border-t-2 border-red-200 dark:border-red-800 mt-2 pt-2 font-bold text-base")}>
                    <span className={row.isTotal?"text-red-600 dark:text-red-400":row.isSubtotal?"font-semibold":"text-muted-foreground pl-3"}>{row.label}</span>
                    <span className={row.isTotal?"font-black text-red-500":"font-medium"}>{formatCurrency(row.amount)}</span>
                  </div>
                ))}
                {(bs.expenditure||[]).length === 0 && (
                  <div className="py-4 text-center text-sm text-muted-foreground">No expenditure data</div>
                )}
              </div>
            </div>
          </div>

          {/* Net Position */}
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
            className={cn("rounded-2xl p-5 border-2 text-center", (bs.netPosition||0)>=0 ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700" : "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700")}>
            <DollarSign className={cn("w-8 h-8 mx-auto mb-2", (bs.netPosition||0)>=0?"text-blue-600":"text-red-500")} />
            <p className="text-sm text-muted-foreground mb-1">Net Position (Income – Expenditure)</p>
            <p className={cn("text-3xl font-black font-display", (bs.netPosition||0)>=0?"text-blue-600":"text-red-500")}>
              {(bs.netPosition||0)<0?"-":""}{formatCurrency(Math.abs(bs.netPosition||0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{(bs.netPosition||0)>=0?"Surplus – Company is profitable":"Deficit – Expenditure exceeds income"}</p>
          </motion.div>

          {/* Notes */}
          <div className="bg-muted/30 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Notes</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>This balance sheet is generated from recorded transactions as at {formatDate(asOfDate)}.</li>
              <li>Figures are in Uganda Shillings (UGX).</li>
              <li>Pending installment payments are included in expenditure at total purchase value.</li>
              <li>This report is for internal management use only.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
