"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Plus, Search, X, Loader2, Check, XCircle,
  ChevronLeft, ChevronRight, Eye, Edit, Package, DollarSign,
  Clock, CheckCircle2, AlertCircle, Send
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useSession } from "next-auth/react";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-warning", APPROVED: "badge-success", REJECTED: "badge-error",
  REVIEWED: "badge-info", PARTIALLY_APPROVED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
};

export default function RequestsPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState<any>(null);
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();
  const role = session?.user?.role;

  const { data, isLoading } = useQuery({
    queryKey: ["requests", debouncedSearch, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (statusFilter) params.set("status", statusFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/requests?${params}`);
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const res = await fetch(`/api/requests/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, notes }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["requests"] }); toast.success("Request updated!"); setViewRequest(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const requests = data?.requests || [];
  const pagination = data?.pagination;
  const canCreate = role === "SITE_MANAGER" || role === "SYSTEM_ADMIN";
  const canReview = role === "SYSTEM_ADMIN" || role === "ACCOUNTANT";

  const statusIcons: Record<string, React.ElementType> = { PENDING: Clock, APPROVED: CheckCircle2, REJECTED: AlertCircle, REVIEWED: Eye };

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Requests</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} requests</p>
        </div>
        {canCreate && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setCreateOpen(true)} className="btn-brand flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Request
          </motion.button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests..." className="input-styled pl-10" />
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto scrollbar-hide">
          {[["", "All"], ["PENDING", "Pending"], ["REVIEWED", "Reviewed"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", statusFilter === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : requests.length === 0 ? (
        <div className="py-20 text-center"><ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" /><p className="text-muted-foreground">No requests found</p></div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any, i: number) => {
            const Icon = statusIcons[req.status] || Clock;
            return (
              <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-2xl p-4 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", req.status === "APPROVED" ? "bg-green-100 dark:bg-green-900/30" : req.status === "REJECTED" ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30")}>
                      <Icon className={cn("w-5 h-5", req.status === "APPROVED" ? "text-green-600" : req.status === "REJECTED" ? "text-red-500" : "text-amber-600")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{req.title}</p>
                        <span className={cn("text-[10px]", STATUS_COLORS[req.status] || "badge-info")}>{req.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{req.project?.name} • By {req.requestedBy?.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(req.createdAt)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{req.items?.length} items requested</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(req.totalAmount)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button onClick={() => setViewRequest(req)} className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-1 transition-colors">
                    <Eye className="w-3 h-3" />View
                  </button>
                  {canReview && req.status === "PENDING" && (
                    <>
                      <button onClick={() => reviewMutation.mutate({ id: req.id, status: "APPROVED" })} className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-950/20 text-green-600 hover:bg-green-100 rounded-lg flex items-center gap-1 transition-colors">
                        <Check className="w-3 h-3" />Approve
                      </button>
                      <button onClick={() => reviewMutation.mutate({ id: req.id, status: "REJECTED" })} className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors">
                        <XCircle className="w-3 h-3" />Reject
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {createOpen && <CreateRequestModal onClose={() => setCreateOpen(false)} onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ["requests"] }); toast.success("Request sent!"); }} />}
      {viewRequest && <RequestDetailModal request={viewRequest} onClose={() => setViewRequest(null)} canReview={canReview} onReview={(id, status, notes) => reviewMutation.mutate({ id, status, notes })} />}
    </div>
  );
}

function CreateRequestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: { projectId: "", title: "", description: "", items: [{ itemName: "", quantity: 1, unit: "pieces", unitPrice: 0, category: "MATERIALS", description: "" }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");
  const total = watchItems.reduce((s: number, i: any) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);

  useState(() => { fetch("/api/projects?limit=50").then(r => r.json()).then(d => setProjects(d.projects || [])); });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, totalAmount: total }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm px-6 pt-6 pb-4 border-b border-border flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-brand rounded-xl flex items-center justify-center"><Send className="w-4 h-4 text-white" /></div>
            <h2 className="font-display font-bold">New Request</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Project *</label>
              <select {...register("projectId", { required: true })} className="input-styled">
                <option value="">Select project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Request Title *</label>
              <input {...register("title", { required: true })} placeholder="e.g., Cement and Sand supply for week 3" className="input-styled" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <textarea {...register("description")} rows={2} placeholder="Additional details..." className="input-styled resize-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Items & Amounts *</label>
              <button type="button" onClick={() => append({ itemName: "", quantity: 1, unit: "pieces", unitPrice: 0, category: "MATERIALS", description: "" })} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" />Add item
              </button>
            </div>
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="p-3 bg-muted/30 rounded-xl border border-border space-y-2">
                  <div className="flex gap-2">
                    <input {...register(`items.${idx}.itemName`, { required: true })} placeholder="Item name" className="input-styled flex-1 text-sm" />
                    <select {...register(`items.${idx}.category`)} className="input-styled text-sm w-36 flex-shrink-0">
                      {["MATERIALS","LABOUR","UTILITIES","EQUIPMENT","TRANSPORT","CHARGES","MISCELLANEOUS"].map(c => <option key={c} value={c}>{c.charAt(0)+c.slice(1).toLowerCase()}</option>)}
                    </select>
                    {fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg flex-shrink-0"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input {...register(`items.${idx}.quantity`, { valueAsNumber: true })} type="number" min="0.01" step="any" placeholder="Qty" className="input-styled text-sm" />
                    <select {...register(`items.${idx}.unit`)} className="input-styled text-sm">
                      {["bags","tonnes","pieces","metres","litres","kgs","rolls","boxes","sets","days","hours","trips"].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} type="number" min="0" placeholder="Unit price" className="input-styled text-sm" />
                    <div className="flex items-center justify-end text-sm font-bold text-primary">
                      {formatCurrency((watchItems[idx]?.quantity || 0) * (watchItems[idx]?.unitPrice || 0))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-primary/5 rounded-xl flex justify-between">
              <span className="font-medium text-sm">Total:</span>
              <span className="font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Sending..." : "Send Request"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function RequestDetailModal({ request, onClose, canReview, onReview }: { request: any; onClose: () => void; canReview: boolean; onReview: (id: string, status: string, notes?: string) => void }) {
  const [notes, setNotes] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">Request Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold">{request.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{request.project?.name} • Requested by {request.requestedBy?.name}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(request.createdAt)}</p>
          </div>
          {request.description && <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl">{request.description}</p>}

          <div>
            <p className="font-semibold text-sm mb-2">Requested Items ({request.items?.length})</p>
            <div className="space-y-2">
              {request.items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-xl text-sm">
                  <div>
                    <p className="font-medium">{item.itemName}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} × {formatCurrency(item.unitPrice)} • {item.category}</p>
                  </div>
                  <p className="font-bold">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 p-3 bg-primary/5 rounded-xl flex justify-between">
              <span className="font-medium text-sm">Total:</span>
              <span className="font-bold text-primary">{formatCurrency(request.totalAmount)}</span>
            </div>
          </div>

          {request.reviewNotes && (
            <div className="p-3 bg-muted/30 rounded-xl">
              <p className="text-xs font-medium mb-1">Review Notes:</p>
              <p className="text-sm text-muted-foreground">{request.reviewNotes}</p>
            </div>
          )}

          {canReview && request.status === "PENDING" && (
            <div className="space-y-3 border-t border-border pt-4">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add review notes (optional)..." rows={2} className="input-styled resize-none" />
              <div className="flex gap-3">
                <button onClick={() => onReview(request.id, "REJECTED", notes)} className="flex-1 py-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" />Reject
                </button>
                <button onClick={() => onReview(request.id, "APPROVED", notes)} className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />Approve
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
