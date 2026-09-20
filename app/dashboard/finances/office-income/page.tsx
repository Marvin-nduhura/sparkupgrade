"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Plus, X, Loader2, ChevronLeft, ChevronRight,
  Eye, Upload, Camera, Edit2, Trash2, Sparkles, DollarSign, Check
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";

const METHODS = ["CASH","BANK_TRANSFER","MTN_MOBILE_MONEY","AIRTEL_MONEY","CHEQUE","OTHER"];

export default function OfficeIncomePage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [viewReceipt, setViewReceipt] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["office-income", page],
    queryFn: async () => {
      const res = await fetch(`/api/finances/office-income?page=${page}&limit=20`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const records = data?.records || [];
  const pagination = data?.pagination;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this income record?")) return;
    try {
      const res = await fetch(`/api/finances/office-income/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["office-income"] });
    } catch { toast.error("Failed to delete"); }
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["office-income"] });

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Office Income</h1>
          <p className="text-sm text-muted-foreground">Office &amp; admin money received</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => { setEditRecord(null); setCreateOpen(true); }}
          className="btn-brand flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Record Income
        </motion.button>
      </div>

      {data?.totalAmount > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl mb-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-muted-foreground">Total Office Income</p>
            <p className="text-2xl font-bold font-display text-green-600">{formatCurrency(data.totalAmount)}</p>
          </div>
          <DollarSign className="w-8 h-8 text-green-300" />
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr>
              <th className="text-left">Date</th>
              <th className="text-left">Source</th>
              <th className="text-left">Method</th>
              <th className="text-left">Reference</th>
              <th className="text-right">Amount</th>
              <th className="text-left">By</th>
              <th className="text-center">Receipt</th>
              <th className="text-center">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton h-5 m-2 rounded" /></td></tr>)
                : records.length === 0
                ? <tr><td colSpan={8} className="py-16 text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" />
                    <p className="text-sm text-muted-foreground">No office income recorded yet</p>
                  </td></tr>
                : records.map((rec: any) => (
                  <tr key={rec.id} className="hover:bg-muted/20 group">
                    <td className="text-xs text-muted-foreground">{formatDate(rec.receivedDate)}</td>
                    <td className="font-medium text-sm">{rec.source}</td>
                    <td><span className="badge-info text-[10px]">{rec.paymentMethod?.replace(/_/g, " ")}</span></td>
                    <td className="text-xs text-muted-foreground">{rec.reference || "—"}</td>
                    <td className="text-right font-bold text-green-600">{formatCurrency(rec.amount)}</td>
                    <td className="text-xs text-muted-foreground">{rec.recordedBy?.name}</td>
                    <td className="text-center">
                      {rec.receipt?.fileUrl ? (
                        <button onClick={() => setViewReceipt(rec.receipt.fileUrl)}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg mx-auto flex items-center gap-1 transition-colors">
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          {rec.receipt?.aiVerified && <Sparkles className="w-3 h-3 text-green-500" />}
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditRecord(rec); setCreateOpen(true); }}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg text-blue-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(rec.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500 transition-colors">
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

      <AnimatePresence>
        {createOpen && (
          <OfficeIncomeModal
            record={editRecord}
            onClose={() => { setCreateOpen(false); setEditRecord(null); }}
            onSuccess={() => { setCreateOpen(false); setEditRecord(null); refresh(); toast.success(editRecord ? "Updated!" : "Income recorded!"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function OfficeIncomeModal({ record, onClose, onSuccess }: {
  record?: any; onClose: () => void; onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const isEdit = !!record;

  const { register, handleSubmit } = useForm({
    defaultValues: {
      source: record?.source || "",
      amount: record?.amount || 0,
      paymentMethod: record?.paymentMethod || "CASH",
      receivedDate: record?.receivedDate
        ? new Date(record.receivedDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      description: record?.description || "",
      reference: record?.reference || "",
    }
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setReceiptFile(f);
    if (f.type.startsWith("image/")) {
      const r = new FileReader(); r.onloadend = () => setPreview(r.result as string); r.readAsDataURL(f);
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/finances/office-income/${record.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => fd.append(k, String(v)));
        if (receiptFile) fd.append("receipt", receiptFile);
        res = await fetch("/api/finances/office-income", { method: "POST", body: fd });
      }
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-display font-bold">{isEdit ? "Edit Income Record" : "Record Office Income"}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Amount (UGX) *</label>
              <input {...register("amount", { valueAsNumber: true, required: true, min: 1 })}
                type="number" min="1" className="input-styled font-bold" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date *</label>
              <input {...register("receivedDate")} type="date" className="input-styled" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Source *</label>
            <input {...register("source", { required: true })}
              placeholder="e.g., Rent income, Consulting fee, Grant" className="input-styled" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Payment Method</label>
              <select {...register("paymentMethod")} className="input-styled">
                {METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Reference</label>
              <input {...register("reference")} placeholder="Ref / Invoice no." className="input-styled" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <textarea {...register("description")} rows={2} className="input-styled resize-none"
              placeholder="Additional details..." />
          </div>
          {!isEdit && (
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
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx" className="hidden" onChange={handleFile} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
              {receiptFile && (
                preview
                  ? <div className="mt-2 relative">
                      <img src={preview} alt="" className="h-24 w-full object-cover rounded-xl" />
                      <div className="absolute top-1 right-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Sparkles className="w-2 h-2" />AI will verify
                      </div>
                    </div>
                  : <div className="mt-2 h-12 bg-muted/50 rounded-xl border border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Upload className="w-4 h-4" />{receiptFile.name}
                    </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? "Saving..." : isEdit ? "Update" : "Record"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
