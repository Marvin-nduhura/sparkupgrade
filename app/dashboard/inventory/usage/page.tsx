"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, Search, Loader2, X, TrendingDown, TrendingUp,
  ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, ArrowLeft
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InventoryUsagePage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"USE" | "RESTOCK">("USE");
  const debouncedProject = useDebounce(projectFilter, 300);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: usageData, isLoading } = useQuery({
    queryKey: ["inventory-usage", typeFilter, page, debouncedProject],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (typeFilter) params.set("type", typeFilter);
      if (debouncedProject) params.set("projectId", debouncedProject);
      const res = await fetch(`/api/inventory/usage?${params}`);
      return res.json();
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects-select"],
    queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); },
  });

  const records = usageData?.records || [];
  const pagination = usageData?.pagination;

  const openModal = (type: "USE" | "RESTOCK") => { setModalType(type); setModalOpen(true); };

  return (
    <div className="page-container">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">Inventory Usage & Restock</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} records</p>
        </div>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => openModal("RESTOCK")}
            className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors">
            <TrendingUp className="w-4 h-4" /> Restock
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => openModal("USE")}
            className="btn-brand flex items-center gap-2 text-sm">
            <TrendingDown className="w-4 h-4" /> Record Use
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {[["", "All"], ["USE", "Used"], ["RESTOCK", "Restocked"]].map(([v, l]) => (
            <button key={v} onClick={() => { setTypeFilter(v); setPage(1); }}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                typeFilter === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {l}
            </button>
          ))}
        </div>
        <select value={projectFilter} onChange={e => { setProjectFilter(e.target.value); setPage(1); }}
          className="input-styled flex-1 min-w-40">
          <option value="">All Projects</option>
          {(projectsData?.projects || []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : records.length === 0 ? (
        <div className="py-20 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
          <p className="text-muted-foreground">No usage records found</p>
          <p className="text-xs text-muted-foreground mt-1">Use the buttons above to record inventory use or restock</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead><tr>
                <th className="text-left">Item</th>
                <th className="text-left">Type</th>
                <th className="text-left">Project</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Remaining</th>
                <th className="text-left">Date</th>
                <th className="text-left">By</th>
                <th className="text-left">Note</th>
              </tr></thead>
              <tbody>
                {records.map((rec: any, i: number) => (
                  <motion.tr key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td className="font-medium">{rec.item?.name}<span className="text-xs text-muted-foreground ml-1">({rec.item?.unit})</span></td>
                    <td>
                      <span className={cn("flex items-center gap-1 text-xs font-semibold w-fit px-2 py-1 rounded-full",
                        rec.type === "USE" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400")}>
                        {rec.type === "USE" ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                        {rec.type === "USE" ? "Used" : "Restocked"}
                      </span>
                    </td>
                    <td className="text-sm text-muted-foreground">{rec.projectId ? "Project" : "—"}</td>
                    <td className={cn("text-right font-mono font-semibold", rec.type === "USE" ? "text-red-500" : "text-green-600")}>
                      {rec.type === "USE" ? "-" : "+"}{rec.quantity}
                    </td>
                    <td className="text-right">
                      <span className={cn("font-mono text-sm", rec.item?.currentQuantity <= 0 ? "text-red-500 font-bold" : "text-foreground")}>
                        {rec.item?.currentQuantity}
                      </span>
                    </td>
                    <td className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(rec.usedDate)}</td>
                    <td className="text-sm text-muted-foreground">{rec.recordedBy?.name || "—"}</td>
                    <td className="text-xs text-muted-foreground max-w-32 truncate">{rec.description || "—"}</td>
                  </motion.tr>
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
      )}

      {/* Record Usage/Restock Modal */}
      <AnimatePresence>
        {modalOpen && (
          <UsageModal
            type={modalType}
            projects={projectsData?.projects || []}
            onClose={() => setModalOpen(false)}
            onSuccess={() => {
              setModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ["inventory-usage"] });
              queryClient.invalidateQueries({ queryKey: ["inventory"] });
              toast.success(modalType === "USE" ? "Usage recorded, inventory updated!" : "Restock recorded, inventory updated!");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UsageModal({ type, projects, onClose, onSuccess }: {
  type: "USE" | "RESTOCK";
  projects: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: { itemId: "", projectId: "", quantity: 1, description: "", usedDate: new Date().toISOString().split("T")[0] },
  });

  const quantity = Number(watch("quantity")) || 0;

  const searchItems = async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    const res = await fetch(`/api/inventory?q=${encodeURIComponent(q)}&limit=8`);
    const d = await res.json();
    setSuggestions(d.items || []);
  };

  const selectItem = (item: any) => {
    setSelectedItem(item);
    setSearch(item.name);
    setValue("itemId", item.id);
    setSuggestions([]);
  };

  const onSubmit = async (data: any) => {
    if (!data.itemId) { toast.error("Please select an item"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const result = await res.json();
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const isUse = type === "USE";
  const remaining = selectedItem ? (isUse ? selectedItem.currentQuantity - quantity : selectedItem.currentQuantity + quantity) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", isUse ? "bg-orange-500" : "bg-green-500")}>
              {isUse ? <TrendingDown className="w-4 h-4 text-white" /> : <TrendingUp className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h2 className="font-display font-bold">{isUse ? "Record Usage" : "Restock Item"}</h2>
              <p className="text-xs text-muted-foreground">{isUse ? "Reduce inventory stock" : "Increase inventory stock"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Item search */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Item *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); searchItems(e.target.value); setSelectedItem(null); setValue("itemId", ""); }}
                placeholder="Search inventory item..."
                className="input-styled pl-10"
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-card border border-border rounded-xl shadow-xl mt-1 overflow-hidden max-h-48 overflow-y-auto">
                  {suggestions.map((s: any) => {
                    const isLow = s.currentQuantity <= s.minimumQuantity && s.minimumQuantity > 0;
                    return (
                      <button key={s.id} type="button" onClick={() => selectItem(s)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left text-sm transition-colors">
                        <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 font-medium">{s.name}</span>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-xs font-semibold", isLow ? "text-red-500" : "text-green-600")}>
                            {s.currentQuantity} {s.unit}
                          </p>
                          {isLow && <p className="text-[9px] text-red-500 flex items-center gap-0.5"><AlertTriangle className="w-2 h-2" />Low</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedItem && (
              <div className={cn("mt-2 p-2.5 rounded-xl text-sm flex items-center justify-between",
                isUse && selectedItem.currentQuantity <= 0 ? "bg-red-50 dark:bg-red-950/20 text-red-600" : "bg-muted/50")}>
                <span>Current stock: <strong>{selectedItem.currentQuantity} {selectedItem.unit}</strong></span>
                {isUse && selectedItem.currentQuantity <= 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Quantity *</label>
              <input {...register("quantity", { valueAsNumber: true, required: true, min: 0.01 })}
                type="number" min="0.01" step="any" className="input-styled" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date</label>
              <input {...register("usedDate")} type="date" className="input-styled" />
            </div>
          </div>

          {/* After quantity preview */}
          {selectedItem && quantity > 0 && remaining !== null && (
            <div className={cn("p-3 rounded-xl text-sm font-medium flex items-center justify-between",
              isUse && remaining < 0 ? "bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-200 dark:border-red-800" :
              isUse && remaining <= selectedItem.minimumQuantity ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 border border-amber-200" :
              "bg-green-50 dark:bg-green-950/20 text-green-700 border border-green-200")}>
              <span>Stock after: <strong>{remaining} {selectedItem?.unit}</strong></span>
              {isUse && remaining < 0 && <span className="text-xs font-normal">Insufficient stock!</span>}
              {isUse && remaining >= 0 && remaining <= selectedItem.minimumQuantity && <span className="text-xs font-normal flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Will be low stock</span>}
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">Project</label>
            <select {...register("projectId")} className="input-styled">
              <option value="">Select project (optional)</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes / Description</label>
            <textarea {...register("description")} rows={2} placeholder="What was this used for or what was restocked?"
              className="input-styled resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className={cn("flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2",
                isUse ? "bg-orange-500 hover:bg-orange-600" : "bg-green-500 hover:bg-green-600")}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isUse ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {loading ? "Saving..." : isUse ? "Record Usage" : "Confirm Restock"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
