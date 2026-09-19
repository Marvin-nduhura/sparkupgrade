"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Plus, Search, X, Loader2, ChevronLeft, ChevronRight,
  DollarSign, Edit2, Trash2, Check
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useSession } from "next-auth/react";

const METHODS = ["CASH","BANK_TRANSFER","MTN_MOBILE_MONEY","AIRTEL_MONEY","CHEQUE","OTHER"];

export default function MoneyReceivedPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [projectFilter, setProjectFilter] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["money-received", debouncedSearch, projectFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (projectFilter) params.set("projectId", projectFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/finances/received?${params}`);
      return res.json();
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/finances/received/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["money-received"] }); toast.success("Record deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const records = data?.records || [];
  const pagination = data?.pagination;
  const totals = data?.totals || {};
  const isAdmin = session?.user?.role === "SYSTEM_ADMIN";
  const canCreate = session?.user?.role === "SITE_MANAGER" || isAdmin;

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Money Received</h1>
          <p className="text-sm text-muted-foreground">Track all funds received on site</p>
        </div>
        {canCreate && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setCreateOpen(true)} className="btn-brand flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Record Receipt
          </motion.button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Received", value: totals.total || 0, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
          { label: "This Month", value: totals.thisMonth || 0, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
          { label: "Transactions", value: pagination?.total || 0, color: "text-primary", bg: "bg-primary/5", isCurrency: false },
        ].map(s => (
          <div key={s.label} className={cn("p-4 rounded-2xl border border-border", s.bg)}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("text-xl font-bold font-display mt-1", s.color)}>
              {s.isCurrency === false ? s.value : formatCurrency(Number(s.value))}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by source, reference..." className="input-styled pl-10" />
        </div>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="input-styled sm:w-48">
          <option value="">All Projects</option>
          {(projectsData?.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr>
              <th className="text-left">Date</th>
              <th className="text-left">Project</th>
              <th className="text-left">Source</th>
              <th className="text-left">Method</th>
              <th className="text-right">Amount</th>
              <th className="text-left">Ref</th>
              <th className="text-left">By</th>
              <th className="text-center">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton h-5 m-2 rounded" /></td></tr>)
                : records.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground text-sm">No records yet</p>
                  </td></tr>
                ) : records.map((rec: any) => (
                  <tr key={rec.id} className="hover:bg-muted/20 group">
                    <td className="text-xs text-muted-foreground">{formatDate(rec.receivedDate)}</td>
                    <td className="font-medium text-sm">{rec.project?.name}</td>
                    <td className="text-sm">{rec.source}</td>
                    <td><span className="badge-info text-[10px]">{rec.paymentMethod?.replace(/_/g," ")}</span></td>
                    <td className="text-right font-bold text-green-600">{formatCurrency(rec.amount)}</td>
                    <td className="text-xs text-muted-foreground">{rec.reference || "—"}</td>
                    <td className="text-xs text-muted-foreground">{rec.receivedBy?.name}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditRecord(rec)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg text-blue-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm("Delete this record?")) deleteMutation.mutate(rec.id); }}
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

      {/* Create Modal */}
      <AnimatePresence>
        {createOpen && (
          <ReceivedModal
            projects={projectsData?.projects || []}
            onClose={() => setCreateOpen(false)}
            onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ["money-received"] }); toast.success("Money received recorded!"); }}
          />
        )}
        {editRecord && (
          <ReceivedModal
            record={editRecord}
            projects={projectsData?.projects || []}
            onClose={() => setEditRecord(null)}
            onSuccess={() => { setEditRecord(null); queryClient.invalidateQueries({ queryKey: ["money-received"] }); toast.success("Record updated!"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ReceivedModal({ record, projects, onClose, onSuccess }: {
  record?: any; projects: any[]; onClose: () => void; onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!record;

  const { register, handleSubmit } = useForm({
    defaultValues: {
      projectId: record?.projectId || "",
      amount: record?.amount || 0,
      source: record?.source || "",
      paymentMethod: record?.paymentMethod || "CASH",
      receivedDate: record?.receivedDate ? record.receivedDate.split("T")[0] : new Date().toISOString().split("T")[0],
      description: record?.description || "",
      reference: record?.reference || "",
    }
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const url = isEdit ? `/api/finances/received/${record.id}` : "/api/finances/received";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center"><DollarSign className="w-4 h-4 text-white" /></div>
            <h2 className="font-display font-bold">{isEdit ? "Edit Record" : "Record Money Received"}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {!isEdit && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Project *</label>
              <select {...register("projectId", { required: !isEdit })} className="input-styled">
                <option value="">Select project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Amount (UGX) *</label>
              <input {...register("amount", { valueAsNumber: true, required: true, min: 1 })} type="number" min="1" className="input-styled" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date *</label>
              <input {...register("receivedDate")} type="date" className="input-styled" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Source *</label>
            <input {...register("source", { required: true })} placeholder="e.g., Company Account, Client Payment" className="input-styled" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Method</label>
              <select {...register("paymentMethod")} className="input-styled">
                {METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Reference</label>
              <input {...register("reference")} placeholder="Ref no." className="input-styled" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <textarea {...register("description")} rows={2} className="input-styled resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? "Update" : "Record"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
