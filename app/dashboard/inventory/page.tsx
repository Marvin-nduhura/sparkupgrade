"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, Search, Filter, AlertTriangle, Edit2, Trash2,
  ChevronLeft, ChevronRight, X, Loader2, TrendingDown, TrendingUp,
  BarChart2, Check
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

const CATEGORIES = ["MATERIALS", "UTILITIES", "EQUIPMENT", "TRANSPORT", "OTHER"];
const UNITS = ["bags", "tonnes", "pieces", "metres", "litres", "kgs", "rolls", "boxes", "sets", "pairs", "drums", "sheets", "bundles"];

const itemSchema = z.object({
  name: z.string().min(2, "Name required"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit required"),
  category: z.string().min(1, "Category required"),
  currentQuantity: z.number().min(0),
  minimumQuantity: z.number().min(0),
  unitPrice: z.number().min(0),
});
type ItemForm = z.infer<typeof itemSchema>;

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [nameSearch, setNameSearch] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const debouncedSearch = useDebounce(search, 300);
  const debouncedName = useDebounce(nameSearch, 300);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", debouncedSearch, category, page],
    queryFn: async () => {
      const params = new URLSearchParams({ q: debouncedSearch, page: String(page), limit: "20" });
      if (category) params.set("category", category);
      const res = await fetch(`/api/inventory?${params}`);
      return res.json();
    },
  });

  // Live search for item name in modal (prevent duplicates)
  const searchNames = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setNameSuggestions([]); return; }
    const res = await fetch(`/api/inventory?q=${encodeURIComponent(q)}&limit=5`);
    const d = await res.json();
    setNameSuggestions(d.items || []);
  }, []);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { currentQuantity: 0, minimumQuantity: 0, unitPrice: 0 },
  });

  const qty = watch("currentQuantity");
  const unitPrice = watch("unitPrice");
  const totalValue = qty * unitPrice;

  const createMutation = useMutation({
    mutationFn: async (data: ItemForm) => {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item added to inventory!");
      setModalOpen(false);
      reset();
      setNameSearch("");
      setNameSuggestions([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ItemForm & { id: string }) => {
      const res = await fetch(`/api/inventory/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item updated!");
      setModalOpen(false);
      setEditItem(null);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Item deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    Object.entries(item).forEach(([k, v]) => setValue(k as any, v as any));
    setNameSearch(item.name);
    setModalOpen(true);
  };

  const openCreate = () => { setEditItem(null); reset(); setNameSearch(""); setModalOpen(true); };

  const onSubmit = (data: ItemForm) => {
    if (editItem) updateMutation.mutate({ ...data, id: editItem.id });
    else createMutation.mutate(data);
  };

  const items = data?.items || [];
  const pagination = data?.pagination;
  const lowStockCount = data?.lowStockCount || 0;

  return (
    <div className="page-container pb-24 md:pb-8">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} items total{lowStockCount > 0 && <span className="text-amber-500 ml-2">• {lowStockCount} low stock</span>}</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openCreate} className="btn-brand flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Item
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..." className="input-styled pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button onClick={() => setCategory("")} className={cn("px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all", !category ? "bg-primary text-white border-primary" : "border-border hover:border-primary")}>All</button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} className={cn("px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all", category === c ? "bg-primary text-white border-primary" : "border-border hover:border-primary")}>
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {lowStockCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{lowStockCount} items</span> are below minimum stock level. Consider restocking.
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr>
              <th className="text-left">Item Name</th>
              <th className="text-left">Category</th>
              <th className="text-center">Unit</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Min Qty</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Value</th>
              <th className="text-center">Status</th>
              <th className="text-center">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="skeleton h-5 rounded" /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No inventory items found</p>
                </td></tr>
              ) : items.map((item: any, i: number) => {
                const isLow = item.currentQuantity <= item.minimumQuantity && item.minimumQuantity > 0;
                const value = item.currentQuantity * item.unitPrice;
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="group">
                    <td className="font-medium">{item.name}</td>
                    <td><span className="badge-info text-[10px]">{item.category}</span></td>
                    <td className="text-center text-sm text-muted-foreground">{item.unit}</td>
                    <td className="text-right font-mono font-semibold">{item.currentQuantity.toLocaleString()}</td>
                    <td className="text-right text-sm text-muted-foreground">{item.minimumQuantity}</td>
                    <td className="text-right text-sm">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right font-semibold text-sm">{formatCurrency(value)}</td>
                    <td className="text-center">
                      {isLow ? (
                        <span className="badge-warning flex items-center gap-1 justify-center w-fit mx-auto">
                          <AlertTriangle className="w-3 h-3" />Low
                        </span>
                      ) : (
                        <span className="badge-success flex items-center gap-1 justify-center w-fit mx-auto">
                          <Check className="w-3 h-3" />OK
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg text-blue-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { if (confirm("Delete this item?")) deleteMutation.mutate(item.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} items)</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-brand rounded-xl flex items-center justify-center">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="font-display font-bold">{editItem ? "Edit Item" : "Add Inventory Item"}</h2>
                </div>
                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                {/* Item name with live search */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Item Name *</label>
                  <div className="relative">
                    <input
                      {...register("name")}
                      value={nameSearch}
                      onChange={e => { setNameSearch(e.target.value); setValue("name", e.target.value); searchNames(e.target.value); }}
                      placeholder="Search or type new item name..."
                      className="input-styled"
                      autoComplete="off"
                    />
                    {nameSuggestions.length > 0 && !editItem && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-card border border-border rounded-xl shadow-xl mt-1 overflow-hidden">
                        {nameSuggestions.map((s: any) => (
                          <button key={s.id} type="button" onClick={() => { setNameSuggestions([]); toast.info("This item already exists. You can edit it instead."); setModalOpen(false); openEdit(s); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left text-sm transition-colors">
                            <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1">{s.name}</span>
                            <span className="text-xs text-amber-500 font-medium">Exists</span>
                          </button>
                        ))}
                        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                          Not the same item? Keep typing to create new.
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Unit *</label>
                    <select {...register("unit")} className="input-styled">
                      <option value="">Select unit</option>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Category *</label>
                    <select {...register("category")} className="input-styled">
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0)+c.slice(1).toLowerCase()}</option>)}
                    </select>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <input {...register("description")} placeholder="Optional description..." className="input-styled" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Current Qty</label>
                    <input {...register("currentQuantity", { valueAsNumber: true })} type="number" min="0" step="any" className="input-styled" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Min Qty</label>
                    <input {...register("minimumQuantity", { valueAsNumber: true })} type="number" min="0" step="any" className="input-styled" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Unit Price (UGX)</label>
                    <input {...register("unitPrice", { valueAsNumber: true })} type="number" min="0" step="any" className="input-styled" />
                  </div>
                </div>

                {/* Total value display */}
                {totalValue > 0 && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Stock Value:</span>
                    <span className="font-bold text-primary">{formatCurrency(totalValue)}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                  <motion.button type="submit" disabled={createMutation.isPending || updateMutation.isPending} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
                    {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editItem ? "Update Item" : "Add to Inventory"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
