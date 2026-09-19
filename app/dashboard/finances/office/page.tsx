"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CreditCard, Plus, X, Loader2, ChevronLeft, ChevronRight, Eye, Upload, Sparkles, AlertTriangle, Edit2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";

export default function OfficeExpensesPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<any>(null);
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
    <div className="page-container">
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
              <th className="text-center">Receipt</th><th className="text-center">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton h-5 m-2 rounded" /></td></tr>)
                : expenses.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center"><CreditCard className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" /><p className="text-sm text-muted-foreground">No office expenses yet</p></td></tr>
                ) : expenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-muted/20 group">
                    <td className="text-xs text-muted-foreground">{formatDate(exp.expenseDate)}</td>
                    <td className="font-medium text-sm">{exp.name}</td>
                    <td><span className="badge-info text-[10px]">{exp.category}</span></td>
                    <td className="text-xs text-muted-foreground">{exp.paymentMethod?.replace(/_/g, " ")}</td>
                    <td className="text-right font-bold">{formatCurrency(exp.amount)}</td>
                    <td className="text-xs text-muted-foreground">{exp.user?.name}</td>
                    <td className="text-center">
                      {exp.receipt?.fileUrl ? (
                        <button onClick={() => setViewReceipt(exp.receipt.fileUrl)}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg mx-auto flex items-center gap-1 transition-colors">
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          {exp.receipt?.aiVerified === true && <Sparkles className="w-3 h-3 text-green-500" />}
                          {exp.receipt?.aiVerified === false && exp.receipt?.aiResult && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditExpense(exp); setCreateOpen(true); }}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg text-blue-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => {
                          if (!confirm("Delete this office expense?")) return;
                          fetch(`/api/finances/office/${exp.id}`, { method: "DELETE" })
                            .then(r => r.json())
                            .then(d => { if (d.success) { queryClient.invalidateQueries({ queryKey: ["office-expenses"] }); toast.success("Deleted"); } else toast.error(d.error); });
                        }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
      {createOpen && <AddOfficeExpenseModal editRecord={editExpense} onClose={() => { setCreateOpen(false); setEditExpense(null); }} onSuccess={() => { setCreateOpen(false); setEditExpense(null); queryClient.invalidateQueries({ queryKey: ["office-expenses"] }); toast.success(editExpense ? "Updated!" : "Expense added!"); }} />}
    </div>
  );
}

function AddOfficeExpenseModal({ editRecord, onClose, onSuccess }: { editRecord?: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!editRecord;

  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: editRecord?.name || "",
      category: editRecord?.category || "OFFICE",
      amount: editRecord?.amount || 0,
      paymentMethod: editRecord?.paymentMethod || "CASH",
      expenseDate: editRecord?.expenseDate ? new Date(editRecord.expenseDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      description: editRecord?.description || "",
    }
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setReceiptFile(f);
    const r = new FileReader(); r.onloadend = () => setPreview(r.result as string); r.readAsDataURL(f);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/finances/office/${editRecord.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: data.name, amount: data.amount, category: data.category, description: data.description, paymentMethod: data.paymentMethod, expenseDate: data.expenseDate }),
        });
      } else {
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => fd.append(k, String(v)));
        if (receiptFile) fd.append("receipt", receiptFile);
        res = await fetch("/api/finances/office", { method: "POST", body: fd });
      }
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const result = await res.json();
      if (!isEdit && result.aiVerification) {
        const ai = result.aiVerification;
        if (ai.verified) toast.success(`✅ Receipt verified by AI (${ai.confidence}% confidence)`);
        else if (ai.confidence > 0) toast.warning(`⚠️ Receipt mismatch — admins notified. ${ai.message}`, { duration: 6000 });
      }
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">{isEdit ? "Edit Office Expense" : "Add Office Expense"}</h2>
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
            <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFile} />
            {receiptFile && (
              preview
                ? <div className="mt-2 relative">
                    <img src={preview} alt="" className="h-20 w-full object-cover rounded-xl" />
                    <div className="absolute top-1 right-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Sparkles className="w-2 h-2" />AI will verify
                    </div>
                  </div>
                : <div className="mt-2 h-12 bg-muted/50 rounded-xl border border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Upload className="w-4 h-4" />{receiptFile.name}
                  </div>
            )}
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
