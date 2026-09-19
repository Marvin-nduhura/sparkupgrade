"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Plus, Search, Filter, Grid3X3, List,
  MapPin, Calendar, Users, Receipt, Image, MoreVertical,
  Edit, Trash2, Eye, HardHat, TrendingUp, TrendingDown
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, formatCurrency, formatDate, getInitials, getAvatarColor, percentage } from "@/lib/utils";
import type { Session } from "next-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { CreateProjectModal } from "@/components/projects/create-project-modal";

interface ProjectsContentProps {
  initialProjects: any[];
  session: Session;
}

const STATUS_FILTERS = ["ALL", "ACTIVE", "PLANNING", "ON_HOLD", "COMPLETED", "CANCELLED"];
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "badge-success",
  PLANNING: "badge-info",
  ON_HOLD: "badge-warning",
  COMPLETED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
  CANCELLED: "badge-error",
};

export function ProjectsContent({ initialProjects, session }: ProjectsContentProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const router = useRouter();

  const filtered = useMemo(() => {
    return initialProjects.filter((p) => {
      const matchSearch =
        !debouncedSearch ||
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.location.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [initialProjects, debouncedSearch, statusFilter]);

  const canCreate = session.user.role === "SYSTEM_ADMIN";

  return (
    <div className="page-container pb-24 md:pb-8">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {initialProjects.length} projects
          </p>
        </div>
        {canCreate && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCreateOpen(true)}
            className="btn-brand flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </motion.button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name or location..."
            className="input-styled pl-10"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-muted p-1 rounded-xl flex-shrink-0">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                statusFilter === status
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {status === "ALL"
                ? "All"
                : status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl flex-shrink-0">
          {(["grid", "list"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "grid" ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid/List */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search ? `No results for "${search}"` : "No projects match the selected filter"}
            </p>
            {canCreate && (
              <button
                onClick={() => setCreateOpen(true)}
                className="btn-brand text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </button>
            )}
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filtered.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                session={session}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {filtered.map((project) => (
              <ProjectListItem
                key={project.id}
                project={project}
                session={session}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Project Modal */}
      {canCreate && (
        <CreateProjectModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            router.refresh();
            toast.success("Project created successfully!");
          }}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, index, session }: { project: any; index: number; session: Session }) {
  const totalReceived = project.moneyReceived?.reduce((s: number, m: any) => s + m.amount, 0) || 0;
  const totalSpent = project.purchases?.reduce((s: number, p: any) => s + p.totalAmount, 0) || 0;
  const spendPct = percentage(totalSpent, totalReceived);
  const managers = project.assignments || [];
  const isAdmin = session.user.role === "SYSTEM_ADMIN";
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success("Project deleted");
      router.refresh();
    } catch (e: any) { toast.error(e.message || "Failed to delete project"); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="relative"
    >
      {/* Admin delete button */}
      {isAdmin && (
        <button
          onClick={handleDelete}
          className="absolute top-2 left-2 z-10 p-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg text-white transition-colors backdrop-blur-sm"
          title="Delete project"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      <Link href={`/dashboard/projects/${project.id}`}>
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer">
          {/* Project Image / Header */}
          <div className="relative h-32 bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center overflow-hidden">
            {project.imageUrl ? (
              <img
                src={project.imageUrl}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <HardHat className="w-12 h-12 text-white/40" />
            )}
            {/* Status badge */}
            <div className="absolute top-3 right-3">
              <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-black/30 text-white backdrop-blur-sm")}>
                {project.status}
              </span>
            </div>
            {/* Image count */}
            {project._count?.images > 0 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
                <Image className="w-3 h-3" />
                {project._count.images}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-display font-bold text-sm truncate">{project.name}</h3>
            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs truncate">{project.location}</span>
            </div>

            {/* Stats row */}
            <div className="flex gap-3 mt-3">
              <div className="text-center flex-1">
                <p className="text-[10px] text-muted-foreground">Received</p>
                <p className="text-xs font-bold text-green-600">{totalReceived >= 1000000 ? `${(totalReceived/1000000).toFixed(1)}M` : `${(totalReceived/1000).toFixed(0)}K`}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] text-muted-foreground">Spent</p>
                <p className="text-xs font-bold text-red-500">{totalSpent >= 1000000 ? `${(totalSpent/1000000).toFixed(1)}M` : `${(totalSpent/1000).toFixed(0)}K`}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] text-muted-foreground">Purchases</p>
                <p className="text-xs font-bold text-primary">{project._count?.purchases || 0}</p>
              </div>
            </div>

            {/* Spend progress */}
            {totalReceived > 0 && (
              <div className="mt-3">
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(spendPct, 100)}%`,
                      background: spendPct > 90
                        ? "linear-gradient(90deg,#ef4444,#dc2626)"
                        : spendPct > 70
                        ? "linear-gradient(90deg,#f59e0b,#ea580c)"
                        : "linear-gradient(90deg,#f97316,#ea580c)"
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{spendPct}% utilized</p>
              </div>
            )}

            {/* Managers */}
            {managers.length > 0 && (
              <div className="flex items-center gap-1 mt-3">
                <div className="flex -space-x-1">
                  {managers.slice(0, 3).map((a: any) => (
                    <div
                      key={a.user.id}
                      title={a.user.name}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-[9px] text-white font-bold",
                        getAvatarColor(a.user.name)
                      )}
                    >
                      {getInitials(a.user.name)}
                    </div>
                  ))}
                </div>
                {managers.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{managers.length - 3}</span>
                )}
                <span className="text-[10px] text-muted-foreground ml-1">
                  {managers.length === 1 ? "manager" : "managers"}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function ProjectListItem({ project, session }: { project: any; session: Session }) {
  const totalReceived = project.moneyReceived?.reduce((s: number, m: any) => s + m.amount, 0) || 0;
  const totalSpent = project.purchases?.reduce((s: number, p: any) => s + p.totalAmount, 0) || 0;
  const isAdmin = session.user.role === "SYSTEM_ADMIN";
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success("Project deleted"); router.refresh();
    } catch (e: any) { toast.error(e.message || "Failed to delete"); }
  };

  return (
    <div className="relative group/item">
      <Link href={`/dashboard/projects/${project.id}`}>
        <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-card-hover transition-all duration-200 flex items-center gap-4 cursor-pointer group">
        {/* Icon */}
        <div className="w-12 h-12 bg-gradient-brand rounded-xl flex items-center justify-center flex-shrink-0">
          <HardHat className="w-6 h-6 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <span className={cn("text-[10px] flex-shrink-0", STATUS_COLORS[project.status] || "badge-info")}>
              {project.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {project.location}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDate(project.createdAt)}
            </span>
          </div>
        </div>

        {/* Financial summary */}
        <div className="hidden sm:flex gap-6 flex-shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Received</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(totalReceived)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Spent</p>
            <p className="text-sm font-bold text-red-500">{formatCurrency(totalSpent)}</p>
          </div>
        </div>

        {/* Arrow */}
        <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </div>
    </Link>
    {isAdmin && (
      <button
        onClick={handleDelete}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors opacity-0 group-hover/item:opacity-100"
        title="Delete project"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    )}
  </div>
  );
}
