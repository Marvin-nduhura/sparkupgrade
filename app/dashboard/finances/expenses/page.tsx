"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, AlertCircle, MoreHorizontal, Plus, Search, X,
  Loader2, ChevronLeft, ChevronRight, Eye, Camera, Upload
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";
import { useSession } from "next-auth/react";
import { useQuery as useQ } from "@tanstack/react-query";

const TYPE_TABS = [
  { value: "", label: "All", icon: null },
  { value: "utilities", label: "🔌 Utilities", icon: Zap },
  { value: "charges", label: "⚡ Charges", icon: AlertCircle },
  { value: "other", label: "📦 Other", icon: MoreHorizontal },
];

const UTILITY_CATS = ["ELECTRICITY", "WATER", "FUEL", "GAS", "INTERNET", "PHONE", "OTHER"];
const CHARGE_CATS = ["LABOUR", "EQUIPMENT_HIRE", "TRANSPORT", "SECURITY", "WASTE_DISPOSAL", "OTHER"];
const OTHER_CATS = ["MISCELLANEOUS", "ENTERTAINMENT", "STATIONERY", "TOOLS", "REPAIRS", "OTHER"];

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"utility" | "charge" | "other">("utility");
  const [viewReceipt, setViewReceipt] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();

  const { data: projectsData } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", debouncedSearch, type, projectFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (type) params.set("type", type);
      if (projectFilter) params.set("projectId", projectFilter);
      const res = await fetch(`/api/finances/expenses?${params}`);
      if (!res.ok) throw new Error("Failed to load expenses");
      return res.json();
    },
  });

  const expenses = data?.expenses || [];
  const pagination = data?.pagination;

  const openCreate = (t: "utility" | "charge" | "other") => { setCreateType(t); setCreateOpen(true); };

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold">Site Expenses</h1>
          <p className="text-sm text-muted-foreground">Utilities, charges &amp; other site costs</p>
        </div>
        {/* Quick-add buttons */}
        <div className="flex gap-2 flex-wrap">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => openCreate("utility")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-all">
            <Zap className="w-3.5 h-3.5" /> + Utility
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => openCreate("charge")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 transition-all">
            <AlertCircle className="w-3.5 h-3.5" /> + Charge
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => openCreate("other")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-all">
            <MoreHorizontal className="w-3.5 h-3.5" /> + Other
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..." className="input-styled pl-10" />
        </div>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="input-styled sm:w-44">
          <option value="">All Projects</option>
          {(projectsData?.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto scrollbar-hide">
          {TYPE_TABS.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", type === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr>
              <th className="text-left">Date</th><th className="text-left">Project</th>
              <th className="text-left">Name</th><th className="text-left">Category</th>
              <th className="text-left">Type</th><th className="text-right">Amount</th>
              <th className="text-center">Receipt</th>
            </tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="skeleton h-5 m-2 rounded" /></td></tr>
              )) : expenses.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground text-sm mb-4">No expenses recorded yet</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => openCreate("utility")} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-medium">+ Add Utility</button>
                    <button onClick={() => openCreate("charge")} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-medium">+ Add Charge</button>
                    <button onClick={() => openCreate("other")} className="px-4 py-2 bg-purple-500 text-white rounded-xl text-xs font-medium">+ Add Other</button>
                  </div>
                </td></tr>
              ) : expenses.map((exp: any, i: number) => {
                const typeColor = exp._type === "utility"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : exp._type === "charge"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
                return (
                  <motion.tr key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-muted/20">
                    <td className="text-xs text-muted-foreground">{formatDate(exp.usageDate || exp.chargeDate || exp.expenseDate)}</td>
                    <td className="text-sm font-medium">{exp.project?.name || "—"}</td>
                    <td className="text-sm">{exp.name}</td>
                    <td><span className="badge-info text-[10px]">{exp.category}</span></td>
                    <td><span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", typeColor)}>{exp._type || "other"}</span></td>
                    <td className="text-right font-bold">{formatCurrency(exp.amount)}</td>
                    <td className="text-center">
                      {exp.receipt?.fileUrl
                        ? <button onClick={() => setViewReceipt(exp.receipt.fileUrl)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg text-blue-600 transition-colors mx-auto block"><Eye className="w-3.5 h-3.5" /></button>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg border hover:bg-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg border hover:bg-muted disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {viewReceipt && <ReceiptViewModal url={viewReceipt} onClose={() => setViewReceipt("")} />}

      {createOpen && (
        <AddExpenseModal
          type={createType}
          projects={projectsData?.projects || []}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            toast.success(`${createType.charAt(0).toUpperCase() + createType.slice(1)} recorded!`);
          }}
        />
      )}
    </div>
  );
}

function AddExpenseModal({ type, projects, onClose, onSuccess }: {
  type: "utility" | "charge" | "other";
  projects: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const cats = type === "utility" ? UTILITY_CATS : type === "charge" ? CHARGE_CATS : OTHER_CATS;
  const colors = type === "utility" ? "bg-amber-500" : type === "charge" ? "bg-orange-500" : "bg-purple-500";
  const Icon = type === "utility" ? Zap : type === "charge" ? AlertCircle : MoreHorizontal;
  const title = type === "utility" ? "Add Utility" : type === "charge" ? "Add Site Charge" : "Add Other Expense";

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      projectId: "", name: "", category: cats[0], amount: 0,
      paymentMethod: "CASH", date: new Date().toISOString().split("T")[0], description: ""
    }
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setReceiptFile(f);
    const r = new FileReader(); r.onloadend = () => setPreview(r.result as string); r.readAsDataURL(f);
  };

  const onSubmit = async (data: any) => {
    if (!data.projectId) { toast.error("Please select a project"); return; }
    if (!data.name) { toast.error("Please enter a name"); return; }
    if (!data.amount || data.amount <= 0) { toast.error("Please enter an amount"); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      Object.entries(data).forEach(([k, v]) => fd.append(k, String(v)));
      if (receiptFile) fd.append("receipt", receiptFile);
      const res = await fetch("/api/finances/expenses", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to record"); }
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", colors)}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Project *</label>
            <select {...register("projectId", { required: true })} className="input-styled">
              <option value="">Select project...</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Name / Description *</label>
            <input {...register("name", { required: true })} placeholder={
              type === "utility" ? "e.g., Electricity bill, Fuel for generator" :
              type === "charge" ? "e.g., Labour wages, Equipment hire" :
              "e.g., Safety equipment, First aid kit"
            } className="input-styled" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <select {...register("category")} className="input-styled">
                {cats.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date *</label>
              <input {...register("date")} type="date" className="input-styled" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Amount (UGX) *</label>
              <input {...register("amount", { valueAsNumber: true, required: true, min: 1 })} type="number" min="1" step="any" placeholder="0" className="input-styled font-bold" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Payment Method</label>
              <select {...register("paymentMethod")} className="input-styled">
                {["CASH","BANK_TRANSFER","MTN_MOBILE_MONEY","AIRTEL_MONEY","CHEQUE"].map(m => (
                  <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes</label>
            <textarea {...register("description")} rows={2} placeholder="Additional details..." className="input-styled resize-none" />
          </div>
          {/* Receipt */}
          <div>
            <label className="text-sm font-medium mb-2 block">Receipt (optional)</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary hover:text-primary transition-all">
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
              <button type="button" onClick={() => cameraRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary hover:text-primary transition-all">
                <Camera className="w-3.5 h-3.5" /> Camera
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            {preview && <img src={preview} alt="Receipt" className="mt-2 h-24 w-full object-cover rounded-xl" />}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className={cn("flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70", colors)}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? "Saving..." : `Record ${type.charAt(0).toUpperCase() + type.slice(1)}`}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
