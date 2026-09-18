"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, Plus, Search, X, Loader2, ChevronLeft, ChevronRight, Zap, AlertCircle, MoreHorizontal, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";

const TYPE_TABS = [["", "All"], ["utilities", "Utilities"], ["charges", "Charges"], ["other", "Other"]];

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewReceipt, setViewReceipt] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", debouncedSearch, type, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (type) params.set("type", type);
      const res = await fetch(`/api/finances/expenses?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const expenses = data?.expenses || [];
  const pagination = data?.pagination;

  const typeIcon = (t: string) => t === "utility" ? Zap : t === "charge" ? AlertCircle : MoreHorizontal;
  const typeColor = (t: string) => t === "utility" ? "text-amber-600 bg-amber-50 dark:bg-amber-950/20" : t === "charge" ? "text-orange-600 bg-orange-50 dark:bg-orange-950/20" : "text-purple-600 bg-purple-50 dark:bg-purple-950/20";

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Site Expenses</h1>
          <p className="text-sm text-muted-foreground">Utilities, charges &amp; other site costs</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setCreateOpen(true)} className="btn-brand flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Expense
        </motion.button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..." className="input-styled pl-10" />
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {TYPE_TABS.map(([v, l]) => (
            <button key={v} onClick={() => setType(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", type === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr>
              <th className="text-left">Date</th>
              <th className="text-left">Project</th>
              <th className="text-left">Name</th>
              <th className="text-left">Category</th>
              <th className="text-left">Type</th>
              <th className="text-right">Amount</th>
              <th className="text-center">Receipt</th>
            </tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton h-5 m-2 rounded" /></td></tr>)
                : expenses.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center"><TrendingDown className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" /><p className="text-sm text-muted-foreground">No expenses found</p></td></tr>
                ) : expenses.map((exp: any, i: number) => {
                  const Icon = typeIcon(exp._type || "other");
                  return (
                    <motion.tr key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-muted/20">
                      <td className="text-xs text-muted-foreground">{formatDate(exp.usageDate || exp.chargeDate || exp.expenseDate)}</td>
                      <td className="text-sm font-medium">{exp.project?.name || "—"}</td>
                      <td className="text-sm">{exp.name}</td>
                      <td><span className="badge-info text-[10px]">{exp.category}</span></td>
                      <td>
                        <span className={cn("flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full w-fit", typeColor(exp._type || "other"))}>
                          <Icon className="w-2.5 h-2.5" />{(exp._type || "other")}
                        </span>
                      </td>
                      <td className="text-right font-bold">{formatCurrency(exp.amount)}</td>
                      <td className="text-center">
                        {exp.receipt?.fileUrl ? (
                          <button onClick={() => setViewReceipt(exp.receipt.fileUrl)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg text-blue-600 transition-colors mx-auto block">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
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
      {createOpen && <AddExpenseModal onClose={() => setCreateOpen(false)} onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense recorded!"); }} />}
    </div>
  );
}

function AddExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const { data: projectsData } = useQuery({ queryKey: ["projects-list"], queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); } });
  const { register, handleSubmit } = useForm({ defaultValues: { type: "utility", projectId: "", name: "", category: "UTILITIES", amount: 0, paymentMethod: "CASH", date: new Date().toISOString().split("T")[0], description: "" } });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/finances/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">Add Expense</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1.5 block">Type</label>
              <select {...register("type")} className="input-styled">
                <option value="utility">Utility</option>
                <option value="charge">Site Charge</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Project *</label>
              <select {...register("projectId", { required: true })} className="input-styled">
                <option value="">Select project</option>
                {(projectsData?.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Name *</label>
            <input {...register("name", { required: true })} placeholder="e.g., Electricity bill" className="input-styled" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-sm font-medium mb-1.5 block">Amount *</label>
              <input {...register("amount", { valueAsNumber: true, required: true, min: 1 })} type="number" min="1" className="input-styled" />
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Method</label>
              <select {...register("paymentMethod")} className="input-styled text-sm">
                {["CASH","BANK_TRANSFER","MTN_MOBILE_MONEY","AIRTEL_MONEY"].map(m => <option key={m} value={m}>{m.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Date</label>
              <input {...register("date")} type="date" className="input-styled" />
            </div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Description</label>
            <textarea {...register("description")} rows={2} className="input-styled resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Expense
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
