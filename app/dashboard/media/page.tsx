"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Camera, Search, Filter, ChevronLeft, ChevronRight, Building2, Download } from "lucide-react";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";

export default function MediaPage() {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [page, setPage] = useState(1);
  const [viewImage, setViewImage] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: projectsData } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => { const r = await fetch("/api/projects?limit=50"); return r.json(); },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["media", debouncedSearch, projectFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (projectFilter) params.set("projectId", projectFilter);
      const res = await fetch(`/api/media?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const images = data?.images || [];
  const pagination = data?.pagination;

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Site Media</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} photos across all projects</p>
        </div>
        <Camera className="w-5 h-5 text-primary" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by collection name..." className="input-styled pl-10" />
        </div>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="input-styled sm:w-52">
          <option value="">All Projects</option>
          {(projectsData?.projects || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton aspect-square rounded-xl" />)}
        </div>
      ) : images.length === 0 ? (
        <div className="py-20 text-center">
          <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
          <h3 className="font-semibold mb-2">No photos yet</h3>
          <p className="text-sm text-muted-foreground">Photos uploaded by site managers will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {images.map((img: any, i: number) => (
            <motion.div key={img.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
              className="group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
              onClick={() => setViewImage(img.imageUrl)}>
              <img src={img.imageUrl} alt={img.description || "Site photo"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                <p className="text-white text-[10px] font-semibold line-clamp-1">{img.project?.name}</p>
                <p className="text-white/70 text-[9px]">{formatDate(img.takenAt)}</p>
                {img.collectionName && <p className="text-white/80 text-[9px]">{img.collectionName}</p>}
              </div>
              <button
                onClick={e => { e.stopPropagation(); const a = document.createElement("a"); a.href = img.imageUrl; a.download = img.fileName || "photo"; a.click(); }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                <Download className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} photos)</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-xl border hover:bg-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-xl border hover:bg-muted disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {viewImage && <ReceiptViewModal url={viewImage} onClose={() => setViewImage("")} />}
    </div>
  );
}
