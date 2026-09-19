"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Receipt, Search, Eye, Download, Filter, ChevronLeft, ChevronRight, FileText, Camera, Zap, AlertCircle, CreditCard, Package } from "lucide-react";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";

const TYPE_TABS = [
  { value: "", label: "All Receipts", icon: Receipt },
  { value: "purchases", label: "Purchases", icon: Package },
  { value: "installments", label: "Installments", icon: CreditCard },
  { value: "utilities", label: "Utilities", icon: Zap },
  { value: "charges", label: "Charges", icon: AlertCircle },
  { value: "other", label: "Other", icon: FileText },
  { value: "office", label: "Office", icon: CreditCard },
];

export default function ReceiptsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [viewUrl, setViewUrl] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["all-receipts", debouncedSearch, type, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (type) params.set("type", type);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const r = await fetch(`/api/receipts?${params}`);
      if (!r.ok) throw new Error("Failed to load receipts");
      return r.json();
    },
  });

  const receipts = data?.receipts || [];
  const pagination = data?.pagination;

  const downloadReceipt = (url: string, name: string) => {
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  };

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold">All Receipts</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} receipts across all categories</p>
        </div>
        <Receipt className="w-5 h-5 text-primary" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipts by filename..." className="input-styled pl-10" />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-muted p-1 rounded-xl">
          {TYPE_TABS.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", type===t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({length:12}).map((_,i)=><div key={i} className="skeleton aspect-square rounded-2xl"/>)}
        </div>
      ) : receipts.length === 0 ? (
        <div className="py-20 text-center">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20"/>
          <p className="text-muted-foreground">No receipts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {receipts.map((rec: any, i: number) => {
            const isImage = rec.fileType?.startsWith("image/");
            const typeBadgeColor = rec._source === "purchase" ? "bg-blue-100 text-blue-700" :
              rec._source === "installment" ? "bg-green-100 text-green-700" :
              rec._source === "utility" ? "bg-amber-100 text-amber-700" :
              rec._source === "charge" ? "bg-orange-100 text-orange-700" :
              rec._source === "office" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700";
            return (
              <motion.div key={rec.id} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.03}}
                className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-card-hover transition-all">
                {/* Preview */}
                <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden cursor-pointer" onClick={() => setViewUrl(rec.fileUrl)}>
                  {isImage ? (
                    <img src={rec.fileUrl} alt={rec.fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-3">
                      <FileText className="w-10 h-10 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground text-center break-all">PDF</p>
                    </div>
                  )}
                  {/* AI badge */}
                  {rec.aiVerified && (
                    <div className="absolute top-1.5 left-1.5 bg-green-500/90 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">AI ✓</div>
                  )}
                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={e => {e.stopPropagation(); setViewUrl(rec.fileUrl);}} className="p-2 bg-white/90 rounded-xl text-gray-800 hover:bg-white transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={e => {e.stopPropagation(); downloadReceipt(rec.fileUrl, rec.fileName);}} className="p-2 bg-white/90 rounded-xl text-gray-800 hover:bg-white transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* Info */}
                <div className="p-2">
                  <p className="text-[10px] font-medium truncate">{rec.fileName}</p>
                  <p className="text-[9px] text-muted-foreground">{formatDate(rec.uploadedAt)}</p>
                  <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block", typeBadgeColor)}>
                    {rec._source || "receipt"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} receipts)</p>
          <div className="flex gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="p-2 rounded-xl border hover:bg-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4"/></button>
            <button disabled={page>=pagination.pages} onClick={()=>setPage(p=>p+1)} className="p-2 rounded-xl border hover:bg-muted disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
          </div>
        </div>
      )}

      {viewUrl && <ReceiptViewModal url={viewUrl} onClose={() => setViewUrl("")} />}
    </div>
  );
}
