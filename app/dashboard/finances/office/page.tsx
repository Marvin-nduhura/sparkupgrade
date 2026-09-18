"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Plus, X, Loader2, ChevronLeft, ChevronRight, Eye, Camera, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";

export default function OfficeExpensesPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewReceipt, setViewReceipt] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["office-expenses", page],
    queryFn: async () => {
      const res = await fetch(`/api/finances/office?page=${page}&limit=20`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const expenses = data?.expenses || [];
  const pagination = data?.pagination;

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Office Expenses</h1>
          <p className="text-sm text-muted-foreground">Company office &amp; administrative costs</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setCreateOpen(true)} className="btn-brand flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Expense
        </motion.button>
      </div>

      {data?.totalAmount > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl mb-4 flex justify-between">
          <div><p className="text-xs text-muted-foreground">Total Office Expenses</p>
            <p className="text-2xl font-bold font-display text-red-600">{formatCurrency(data.totalAmount)}</p></div>
          <CreditCard className="w-8 h-8 text-red-300" />
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr>
              <th className="text-left">Date</th><th className="text-left">Name</th>
              <th className="text-left">Category</th><th className="text-left">Method</th>
              <th className="text-right">Amount</th><th className="text-left">By</th>
              <th className="text-center">Receipt</th>
            </tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton h-5 m-2 rounded" /></td></tr>)
                : expenses.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center"><CreditCard className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" /><p className="text-sm text-muted-foreground">No office expenses yet</p></td></tr>
                ) : expenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-muted/20">
                    <td className="text-xs text-muted-foreground">{formatDate(exp.expenseDate)}</td>
                    <td className="font-medium text-sm">{exp.name}</td>
                    <td><span className="badge-info text-[10px]">{exp.category}</span></td>
                    <td className="text-xs text-muted-foreground">{exp.paymentMethod?.replace(/_/g, " ")}</td>
                    <td className="text-right font-bold">{formatCurrency(exp.amount)}</td>
                    <td className="text-xs text-muted-foreground">{exp.user?.name}</td>
                    <td className="text-center">
                      {exp.receipt?.fileUrl ? (
                        <button onClick={() => setViewReceipt(exp.receipt.fileUrl)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg text-blue-600 mx-auto block">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
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
      {createOpen && <AddOfficeExpenseModal onClose={() => setCreateOpen(false)} onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ["office-expenses"] }); toast.success("Expense added!"); }} />}
    </div>
  );
}

function AddOfficeExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit } = useForm({ defaultValues: { name: "", category: "OFFICE", amount: 0, paymentMethod: "CASH", expenseDate: new Date().toISOString().split("T")[0], description: "" } });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setReceiptFile(f);
    const r = new FileReader(); r.onloadend = () => setPreview(r.result as string); r.readAsDataURL(f);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => fd.append(k, String(v)));
      if (receiptFile) fd.append("receipt", receiptFile);
      const res = await fetch("/api/finances/office", { method: "POST", body: fd });
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
          <h2 className="font-display font-bold">Add Office Expense</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">Name *</label>
            <input {...register("name", { required: true })} placeholder="e.g., Office rent, Stationery" className="input-styled" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1.5 block">Amount (UGX) *</label>
              <input {...register("amount", { valueAsNumber: true, required: true, min: 1 })} type="number" min="1" className="input-styled" />
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Date</label>
              <input {...register("expenseDate")} type="date" className="input-styled" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1.5 block">Category</label>
              <select {...register("category")} className="input-styled">
                {["OFFICE","TRANSPORT","UTILITIES","EQUIPMENT","MISCELLANEOUS"].map(c => <option key={c} value={c}>{c.charAt(0)+c.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium mb-1.5 block">Payment</label>
              <select {...register("paymentMethod")} className="input-styled">
                {["CASH","BANK_TRANSFER","MTN_MOBILE_MONEY","AIRTEL_MONEY"].map(m => <option key={m} value={m}>{m.replace(/_/g," ")}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Description</label>
            <textarea {...register("description")} rows={2} className="input-styled resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Receipt</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            {preview && <img src={preview} alt="" className="mt-2 h-20 w-full object-cover rounded-xl" />}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
