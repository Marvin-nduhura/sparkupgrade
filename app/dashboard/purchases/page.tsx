"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt, Plus, Search, Filter, Loader2, X, Camera, Upload,
  ChevronLeft, ChevronRight, DollarSign, CheckCircle2, AlertCircle,
  Eye, CreditCard, Package, Sparkles, Check, AlertTriangle
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { AddInstallmentModal } from "@/components/purchases/add-installment-modal";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";
import { useRef } from "react";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "MTN_MOBILE_MONEY", "AIRTEL_MONEY", "CHEQUE", "OTHER"];

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [installmentPurchase, setInstallmentPurchase] = useState<any>(null);
  const [viewReceipt, setViewReceipt] = useState<string>("");
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["purchases", debouncedSearch, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/purchases?${params}`);
      return res.json();
    },
  });

  const purchases = data?.purchases || [];
  const pagination = data?.pagination;

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Purchases</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} purchases recorded</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setCreateOpen(true)} className="btn-brand flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Record Purchase
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search purchases..." className="input-styled pl-10" />
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {[["", "All"], ["PARTIAL", "Partial"], ["COMPLETED", "Paid"]].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap", statusFilter === val ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Cards */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : purchases.length === 0 ? (
        <div className="py-20 text-center"><Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" /><p className="text-muted-foreground">No purchases yet</p></div>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase: any, i: number) => {
            const paidPct = purchase.totalAmount > 0 ? Math.round((purchase.amountPaid / purchase.totalAmount) * 100) : 0;
            const isPaid = purchase.paymentStatus === "COMPLETED";
            return (
              <motion.div key={purchase.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-4 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", isPaid ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30")}>
                      <Receipt className={cn("w-5 h-5", isPaid ? "text-green-600" : "text-amber-600")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{purchase.project?.name}</p>
                        <span className={cn("text-[10px] font-bold", isPaid ? "badge-success" : "badge-warning")}>{purchase.paymentStatus}</span>
                        {purchase.receipt?.aiVerified && <span className="badge-info text-[10px] flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" />AI Verified</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(purchase.purchaseDate)} • {purchase.purchasedBy?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {purchase.items?.slice(0, 3).map((it: any) => it.item?.name).filter(Boolean).join(", ")}
                        {purchase.items?.length > 3 && ` +${purchase.items.length - 3} more`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(purchase.totalAmount)}</p>
                    <p className="text-xs text-green-600">{formatCurrency(purchase.amountPaid)} paid</p>
                    {purchase.amountDue > 0 && <p className="text-xs text-red-500">{formatCurrency(purchase.amountDue)} due</p>}
                  </div>
                </div>

                {/* Payment progress */}
                {!isPaid && (
                  <div className="mt-3">
                    <div className="progress-bar">
                      <motion.div className="progress-bar-fill" initial={{ width: 0 }} animate={{ width: `${paidPct}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{paidPct}% paid</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button onClick={() => setSelectedPurchase(purchase)} className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-1 transition-colors">
                    <Eye className="w-3 h-3" />Details
                  </button>
                  {purchase.receipt?.fileUrl && (
                    <button onClick={() => setViewReceipt(purchase.receipt.fileUrl)} className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors">
                      <Receipt className="w-3 h-3" />Receipt
                    </button>
                  )}
                  {!isPaid && (
                    <button onClick={() => setInstallmentPurchase(purchase)} className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-950/20 text-green-600 hover:bg-green-100 rounded-lg flex items-center gap-1 transition-colors">
                      <CreditCard className="w-3 h-3" />Add Payment
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!confirm("Delete this purchase? This will reverse inventory quantities.")) return;
                      fetch(`/api/purchases/${purchase.id}`, { method: "DELETE" })
                        .then(r => r.json())
                        .then(d => { if (d.success) { queryClient.invalidateQueries({ queryKey: ["purchases"] }); toast.success("Purchase deleted"); } else toast.error(d.error); })
                        .catch(() => toast.error("Failed to delete"));
                    }}
                    className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors ml-auto">
                    <AlertTriangle className="w-3 h-3" />Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Create Purchase Modal */}
      {createOpen && <CreatePurchaseModal onClose={() => setCreateOpen(false)} onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ["purchases"] }); toast.success("Purchase recorded!"); }} />}

      {/* Installment Modal */}
      {installmentPurchase && <AddInstallmentModal purchase={installmentPurchase} onClose={() => setInstallmentPurchase(null)} onSuccess={() => { setInstallmentPurchase(null); queryClient.invalidateQueries({ queryKey: ["purchases"] }); }} />}

      {/* Receipt View */}
      {viewReceipt && <ReceiptViewModal url={viewReceipt} onClose={() => setViewReceipt("")} />}

      {/* Purchase Detail */}
      {selectedPurchase && <PurchaseDetailModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} onViewReceipt={setViewReceipt} />}
    </div>
  );
}

// ─── Create Purchase Modal ───────────────────────────────────────────────────
function CreatePurchaseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [inventorySearch, setInventorySearch] = useState<Record<number, string>>({});
  const [inventorySuggestions, setInventorySuggestions] = useState<Record<number, any[]>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      projectId: "", purchaseDate: new Date().toISOString().split("T")[0],
      description: "", initialPayment: 0, paymentMethod: "CASH",
      items: [{ itemName: "", quantity: 1, unit: "pieces", unitPrice: 0, category: "MATERIALS" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");

  const totalAmount = watchItems.reduce((s: number, i: any) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);
  const initialPayment = Number(watch("initialPayment")) || 0;

  useState(() => {
    fetch("/api/projects?limit=50").then(r => r.json()).then(d => setProjects(d.projects || []));
  });

  const searchInventory = async (idx: number, q: string) => {
    setInventorySearch(p => ({ ...p, [idx]: q }));
    setValue(`items.${idx}.itemName`, q);
    if (q.length < 2) { setInventorySuggestions(p => ({ ...p, [idx]: [] })); return; }
    const res = await fetch(`/api/inventory?q=${encodeURIComponent(q)}&limit=5`);
    const d = await res.json();
    setInventorySuggestions(p => ({ ...p, [idx]: d.items || [] }));
  };

  const selectInventoryItem = (idx: number, item: any) => {
    setInventorySearch(p => ({ ...p, [idx]: item.name }));
    setValue(`items.${idx}.itemName`, item.name);
    setValue(`items.${idx}.unit`, item.unit);
    setValue(`items.${idx}.unitPrice`, item.unitPrice);
    setValue(`items.${idx}.category`, item.category);
    setInventorySuggestions(p => ({ ...p, [idx]: [] }));
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
    setAiResult(null);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (k !== "items") formData.append(k, String(v)); });
      formData.append("items", JSON.stringify(data.items));
      if (receiptFile) formData.append("receipt", receiptFile);
      const res = await fetch("/api/purchases", { method: "POST", body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const result = await res.json();
      if (result.aiVerification) {
        const ai = result.aiVerification;
        setAiResult(ai);
        if (ai.verified) {
          toast.success(`✅ Receipt verified by AI (${ai.confidence}% confidence)`);
        } else {
          toast.error(`⚠️ Receipt mismatch detected — admins have been notified. ${ai.message}`, { duration: 8000 });
        }
      }
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm px-6 pt-6 pb-4 border-b border-border flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-brand rounded-xl flex items-center justify-center"><Receipt className="w-4 h-4 text-white" /></div>
            <h2 className="font-display font-bold">Record Purchase</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Project *</label>
              <select {...register("projectId", { required: true })} className="input-styled">
                <option value="">Select project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Purchase Date *</label>
              <input {...register("purchaseDate")} type="date" className="input-styled" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <input {...register("description")} placeholder="Brief description..." className="input-styled" />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Items *</label>
              <button type="button" onClick={() => append({ itemName: "", quantity: 1, unit: "pieces", unitPrice: 0, category: "MATERIALS" })}
                className="text-xs text-primary flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" />Add item
              </button>
            </div>
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="p-3 bg-muted/30 rounded-xl border border-border space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 relative">
                      <input value={inventorySearch[idx] ?? watchItems[idx]?.itemName ?? ""} onChange={e => searchInventory(idx, e.target.value)}
                        placeholder="Search item name..." className="input-styled text-sm" />
                      {(inventorySuggestions[idx]?.length ?? 0) > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 bg-card border border-border rounded-xl shadow-xl mt-1 overflow-hidden">
                          {inventorySuggestions[idx].map((s: any) => (
                            <button key={s.id} type="button" onClick={() => selectInventoryItem(idx, s)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-sm">
                              <Package className="w-3 h-3 text-muted-foreground" />
                              <span className="flex-1">{s.name}</span>
                              <span className="text-xs text-muted-foreground">{s.unit}</span>
                              <span className="text-xs text-primary font-medium">{formatCurrency(s.unitPrice)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg flex-shrink-0"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div><input {...register(`items.${idx}.quantity`, { valueAsNumber: true })} type="number" min="0.01" step="any" placeholder="Qty" className="input-styled text-sm" /></div>
                    <div><select {...register(`items.${idx}.unit`)} className="input-styled text-sm">{["bags","tonnes","pieces","metres","litres","kgs","rolls","boxes","sets","sheets"].map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                    <div><input {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} type="number" min="0" step="any" placeholder="Unit price" className="input-styled text-sm" /></div>
                    <div className="flex items-center justify-end"><span className="text-sm font-semibold text-primary">{formatCurrency((watchItems[idx]?.quantity || 0) * (watchItems[idx]?.unitPrice || 0))}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-primary/5 rounded-xl flex justify-between items-center">
              <span className="font-medium text-sm">Total Amount:</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Initial Payment (UGX)</label>
              <input {...register("initialPayment", { valueAsNumber: true })} type="number" min="0" max={totalAmount} className="input-styled" />
              <p className="text-xs text-muted-foreground mt-1">Balance: {formatCurrency(Math.max(0, totalAmount - initialPayment))}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Payment Method</label>
              <select {...register("paymentMethod")} className="input-styled">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Receipt / Invoice</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Upload className="w-4 h-4" /> Upload File
              </button>
              <button type="button" onClick={() => cameraRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Camera className="w-4 h-4" /> Take Photo
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleReceiptChange} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptChange} />
            {receiptFile && (
              <div className="mt-2 relative">
                {receiptPreview ? (
                  <img src={receiptPreview} alt="Receipt" className="w-full h-32 object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-20 bg-muted/50 rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground border border-border">
                    <Package className="w-5 h-5" />
                    <span className="truncate max-w-48">{receiptFile.name}</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI will verify
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              {loading ? "Processing..." : "Record Purchase"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Purchase Detail Modal ────────────────────────────────────────────────────
function PurchaseDetailModal({ purchase, onClose, onViewReceipt }: { purchase: any; onClose: () => void; onViewReceipt: (url: string) => void }) {
  // Parse AI result if stored on receipt
  const aiResult = (() => {
    try {
      const raw = purchase.receipt?.aiResult;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">Purchase Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted-foreground text-xs">Project</p><p className="font-semibold">{purchase.project?.name}</p></div>
            <div><p className="text-muted-foreground text-xs">Date</p><p className="font-semibold">{formatDate(purchase.purchaseDate)}</p></div>
            <div><p className="text-muted-foreground text-xs">Total Amount</p><p className="font-bold text-primary">{formatCurrency(purchase.totalAmount)}</p></div>
            <div><p className="text-muted-foreground text-xs">Amount Paid</p><p className="font-bold text-green-600">{formatCurrency(purchase.amountPaid)}</p></div>
            <div><p className="text-muted-foreground text-xs">Amount Due</p><p className="font-bold text-red-500">{formatCurrency(purchase.amountDue)}</p></div>
            <div><p className="text-muted-foreground text-xs">Status</p><span className={cn(purchase.paymentStatus === "COMPLETED" ? "badge-success" : "badge-warning")}>{purchase.paymentStatus}</span></div>
          </div>

          {/* AI Verification Result */}
          {aiResult && (
            <div className={cn("rounded-xl p-3 text-sm border", aiResult.verified ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800")}>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className={cn("w-4 h-4", aiResult.verified ? "text-green-600" : "text-red-500")} />
                <p className={cn("font-semibold text-xs", aiResult.verified ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                  {aiResult.verified ? `✅ AI Verified (${aiResult.confidence}% confidence)` : `⚠️ Receipt Mismatch (${aiResult.confidence}% confidence)`}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{aiResult.message}</p>
              {aiResult.mismatches?.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-red-600">Mismatches found:</p>
                  {aiResult.mismatches.map((m: any, i: number) => (
                    <div key={i} className="text-xs bg-red-100 dark:bg-red-900/20 rounded-lg px-2 py-1.5">
                      <span className="font-medium">{m.item}</span>
                      <span className="text-muted-foreground ml-1">— {m.issue.replace(/_/g, " ")}</span>
                      {m.issue === "NOT_FOUND" && <span className="ml-1 text-red-500 font-medium">(not on receipt)</span>}
                      {m.issue === "WRONG_PRICE" && m.claimedUnitPrice && (
                        <span className="ml-1 text-muted-foreground">claimed {formatCurrency(m.claimedUnitPrice)} vs found {m.foundUnitPrice ? formatCurrency(m.foundUnitPrice) : "unknown"}</span>
                      )}
                      {m.issue === "WRONG_QTY" && (
                        <span className="ml-1 text-muted-foreground">claimed {m.claimedQty} vs found {m.foundQty ?? "unknown"}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {aiResult.suggestions?.length > 0 && !aiResult.verified && (
                <p className="text-xs text-muted-foreground mt-1.5 italic">{aiResult.suggestions.join("; ")}</p>
              )}
            </div>
          )}

          <div>
            <p className="font-semibold text-sm mb-2">Items ({purchase.items?.length})</p>
            <div className="space-y-2">
              {purchase.items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-xl text-sm">
                  <div><p className="font-medium">{item.item?.name}</p><p className="text-xs text-muted-foreground">{item.quantity} {item.item?.unit} × {formatCurrency(item.unitPrice)}</p></div>
                  <p className="font-bold">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>
          </div>

          {purchase.installments?.length > 0 && (
            <div>
              <p className="font-semibold text-sm mb-2">Payment History ({purchase.installments.length})</p>
              <div className="space-y-2">
                {purchase.installments.map((inst: any) => (
                  <div key={inst.id} className="flex items-center justify-between p-2.5 bg-green-50 dark:bg-green-950/20 rounded-xl text-sm">
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">{formatCurrency(inst.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(inst.paymentDate)} • {inst.paymentMethod?.replace(/_/g," ")}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {inst.verifiedByAi && <span className="badge-info text-[10px] flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" />AI Verified</span>}
                      {!inst.verifiedByAi && inst.receipt?.fileUrl && <span className="text-[10px] text-amber-500 font-medium">⚠ Not verified</span>}
                      {inst.receipt?.fileUrl && (
                        <button onClick={() => onViewReceipt(inst.receipt.fileUrl)} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {purchase.receipt?.fileUrl && (
            <button onClick={() => { onViewReceipt(purchase.receipt.fileUrl); onClose(); }}
              className="w-full py-2.5 text-sm bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" />
              {purchase.receipt.aiVerified ? "View Verified Receipt" : "View Receipt"}
              {!purchase.receipt.aiVerified && <span className="text-[10px] text-amber-500 ml-1">⚠ Unverified</span>}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
