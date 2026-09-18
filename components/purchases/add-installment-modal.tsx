"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, CreditCard, Camera, Upload, Loader2, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export function AddInstallmentModal({ purchase, onClose, onSuccess }: { purchase: any; onClose: () => void; onSuccess: () => void }) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch } = useForm({
    defaultValues: { amount: purchase.amountDue, paymentMethod: "CASH", paymentDate: new Date().toISOString().split("T")[0] },
  });

  const amount = Number(watch("amount")) || 0;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setReceiptFile(f);
    const r = new FileReader();
    r.onloadend = () => setReceiptPreview(r.result as string);
    r.readAsDataURL(f);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("purchaseId", purchase.id);
      formData.append("amount", data.amount);
      formData.append("paymentMethod", data.paymentMethod);
      formData.append("paymentDate", data.paymentDate);
      if (receiptFile) formData.append("receipt", receiptFile);
      const res = await fetch("/api/installments", { method: "POST", body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Payment recorded!");
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center"><CreditCard className="w-4 h-4 text-white" /></div>
            <div>
              <h2 className="font-display font-bold">Add Payment</h2>
              <p className="text-xs text-muted-foreground">Remaining: {formatCurrency(purchase.amountDue)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Amount (UGX) *</label>
            <input {...register("amount", { valueAsNumber: true, required: true, min: 1, max: purchase.amountDue })} type="number" min="1" max={purchase.amountDue} className="input-styled text-lg font-bold" />
            {amount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                After this: <span className="text-green-600 font-medium">{formatCurrency(purchase.amountPaid + amount)}</span> paid, <span className="text-red-500 font-medium">{formatCurrency(Math.max(0, purchase.amountDue - amount))}</span> remaining
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Method</label>
              <select {...register("paymentMethod")} className="input-styled">
                {["CASH","BANK_TRANSFER","MTN_MOBILE_MONEY","AIRTEL_MONEY","CHEQUE"].map(m => <option key={m} value={m}>{m.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date</label>
              <input {...register("paymentDate")} type="date" className="input-styled" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Payment Receipt</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
              <button type="button" onClick={() => cameraRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <Camera className="w-3.5 h-3.5" /> Camera
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            {receiptPreview && (
              <div className="mt-2 relative">
                <img src={receiptPreview} alt="Receipt" className="w-full h-24 object-cover rounded-xl" />
                <div className="absolute top-1 right-1 bg-primary/80 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Sparkles className="w-2 h-2" />AI verify</div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {loading ? "Processing..." : "Record Payment"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
