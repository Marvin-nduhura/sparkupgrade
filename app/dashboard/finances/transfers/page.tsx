"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Plus, X, Loader2, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, XCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: "badge-success",
  PENDING: "badge-warning",
  FAILED: "badge-error",
};
const STATUS_ICON: Record<string, any> = {
  COMPLETED: CheckCircle2,
  PENDING: Clock,
  FAILED: XCircle,
};

export default function TransfersPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [sendOpen, setSendOpen] = useState(false);
  const queryClient = useQueryClient();
  const isAdmin = session?.user?.role === "SYSTEM_ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: ["transfers", page],
    queryFn: async () => {
      const res = await fetch(`/api/finances/transfers?page=${page}&limit=20`);
      if (!res.ok) throw new Error("Failed to load transfers");
      return res.json();
    },
  });

  const transfers = data?.transfers || [];
  const pagination = data?.pagination;

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Money Transfers</h1>
          <p className="text-sm text-muted-foreground">Funds sent to site managers via PesaPal mobile money</p>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSendOpen(true)}
            className="btn-brand flex items-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" /> Send Money
          </motion.button>
        )}
      </div>

      {/* Total sent */}
      {(data?.totalSent || 0) > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Sent (all time)</p>
            <p className="text-2xl font-bold font-display text-green-600">{formatCurrency(data.totalSent)}</p>
          </div>
          <Send className="w-8 h-8 text-green-400 opacity-40" />
        </div>
      )}

      {/* Transfer list */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
          : transfers.length === 0
          ? (
            <div className="py-20 text-center">
              <Send className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">No transfers yet</p>
            </div>
          ) : transfers.map((tr: any, i: number) => {
            const Icon = STATUS_ICON[tr.status] || Clock;
            return (
              <motion.div
                key={tr.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-4 flex items-start gap-4"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  tr.status === "COMPLETED" ? "bg-green-100 dark:bg-green-900/30" :
                  tr.status === "FAILED" ? "bg-red-100 dark:bg-red-900/30" :
                  "bg-amber-100 dark:bg-amber-900/30"
                )}>
                  <Icon className={cn(
                    "w-5 h-5",
                    tr.status === "COMPLETED" ? "text-green-600" :
                    tr.status === "FAILED" ? "text-red-500" : "text-amber-600"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">
                      {tr.sentBy?.name} → {tr.receivedBy?.name}
                    </p>
                    <span className={cn("text-[10px]", STATUS_BADGE[tr.status] || "badge-info")}>
                      {tr.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tr.paymentMethod?.replace(/_/g, " ")} • {formatDateTime(tr.sentAt)}
                  </p>
                  {tr.reference && (
                    <p className="text-xs text-muted-foreground">Ref: {tr.reference}</p>
                  )}
                  {tr.description && (
                    <p className="text-xs text-muted-foreground truncate">{tr.description}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm">{formatCurrency(tr.amount)}</p>
                  {tr.confirmedAt && (
                    <p className="text-[10px] text-green-600 mt-0.5">Confirmed</p>
                  )}
                </div>
              </motion.div>
            );
          })}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Send money modal */}
      {sendOpen && (
        <SendMoneyModal
          onClose={() => setSendOpen(false)}
          onSuccess={(redirectUrl) => {
            setSendOpen(false);
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
            if (redirectUrl) {
              window.open(redirectUrl, "_blank");
              toast.success("Transfer initiated! Complete payment in the new tab.");
            }
          }}
        />
      )}
    </div>
  );
}

function SendMoneyModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (url?: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const { data: usersData } = useQuery({
    queryKey: ["users-managers"],
    queryFn: async () => {
      const r = await fetch("/api/users?role=SITE_MANAGER&limit=50");
      return r.json();
    },
  });
  const { data: projectsData } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const r = await fetch("/api/projects?limit=50");
      return r.json();
    },
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      toUserId: "",
      projectId: "",
      amount: 0,
      paymentMethod: "MTN_MOBILE_MONEY",
      description: "",
    },
  });

  const selectedUserId = watch("toUserId");
  const selectedUser = (usersData?.users || []).find((u: any) => u.id === selectedUserId);
  const paymentMethod = watch("paymentMethod");

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/pesapal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Transfer failed");
      }
      const result = await res.json();
      onSuccess(result.redirectUrl);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const hasPhone = selectedUser
    ? paymentMethod === "MTN_MOBILE_MONEY"
      ? !!selectedUser.mtnNumber
      : !!selectedUser.airtelNumber
    : true;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold">Send Money</h2>
              <p className="text-xs text-muted-foreground">via PesaPal Mobile Money</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Recipient (Site Manager) *
            </label>
            <select {...register("toUserId", { required: "Please select a recipient" })} className="input-styled">
              <option value="">Select site manager...</option>
              {(usersData?.users || []).map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.mtnNumber ? ` – MTN: ${u.mtnNumber}` : ""}
                  {u.airtelNumber ? ` – Airtel: ${u.airtelNumber}` : ""}
                </option>
              ))}
            </select>
            {errors.toUserId && (
              <p className="text-red-500 text-xs mt-1">{errors.toUserId.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Payment Method *</label>
            <select {...register("paymentMethod")} className="input-styled">
              <option value="MTN_MOBILE_MONEY">MTN Mobile Money</option>
              <option value="AIRTEL_MONEY">Airtel Money</option>
            </select>
          </div>

          {/* Warning if no phone number */}
          {selectedUser && !hasPhone && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600">
              ⚠️ {selectedUser.name} has no{" "}
              {paymentMethod === "MTN_MOBILE_MONEY" ? "MTN" : "Airtel"} number on file.
              Ask them to update their profile first.
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">Project (optional)</label>
            <select {...register("projectId")} className="input-styled">
              <option value="">General transfer (no project)</option>
              {(projectsData?.projects || []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Amount (UGX) *</label>
            <input
              {...register("amount", {
                valueAsNumber: true,
                required: "Amount is required",
                min: { value: 500, message: "Minimum transfer is UGX 500" },
              })}
              type="number"
              min="500"
              step="100"
              placeholder="e.g. 500000"
              className="input-styled text-lg font-bold"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <input
              {...register("description")}
              placeholder="e.g. Week 3 site materials budget"
              className="input-styled"
            />
          </div>

          {/* Info box */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-semibold">How this works:</p>
            <p>1. You'll be redirected to PesaPal to confirm payment</p>
            <p>2. The recipient receives a mobile money prompt on their phone</p>
            <p>3. They enter their PIN to confirm receipt</p>
            <p>4. The transfer is automatically recorded in the system</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={loading || !hasPhone}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? "Processing..." : "Send Money"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
