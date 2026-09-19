"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, MapPin, Calendar, Users, Package, Receipt, DollarSign,
  TrendingUp, TrendingDown, Camera, Edit2, ArrowLeft, ChevronDown,
  ChevronRight, Clock, CheckCircle2, Image, Zap, FileText, Map,
  Navigation, HardHat, AlertCircle, Plus, ExternalLink, Eye, X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, formatCurrency, formatDate, formatDateTime, getInitials, getAvatarColor, percentage } from "@/lib/utils";
import type { Session } from "next-auth";
import { ReceiptViewModal } from "@/components/purchases/receipt-view-modal";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const tabs = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "finances", label: "Finances", icon: DollarSign },
  { id: "purchases", label: "Purchases", icon: Receipt },
  { id: "expenses", label: "Expenses", icon: TrendingDown },
  { id: "requests", label: "Requests", icon: FileText },
  { id: "gallery", label: "Gallery", icon: Camera },
  { id: "team", label: "Team", icon: Users },
];

export function ProjectDetailContent({ project, session, totalReceived, totalSpent }: {
  project: any; session: Session; totalReceived: number; totalSpent: number;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [viewReceipt, setViewReceipt] = useState("");
  const [uploadMediaOpen, setUploadMediaOpen] = useState(false);
  const router = useRouter();
  const balance = totalReceived - totalSpent;
  const spendPct = percentage(totalSpent, totalReceived);
  const isManager = session.user.role === "SITE_MANAGER";
  const isAdmin = session.user.role === "SYSTEM_ADMIN";

  const openMap = () => {
    if (project.latitude && project.longitude) {
      window.open(`https://www.openstreetmap.org/?mlat=${project.latitude}&mlon=${project.longitude}&zoom=16`, "_blank");
    } else {
      window.open(`https://www.openstreetmap.org/search?query=${encodeURIComponent(project.location)}`, "_blank");
    }
  };

  const getDirections = () => {
    if (project.latitude && project.longitude) {
      window.open(`https://www.openstreetmap.org/directions?to=${project.latitude}%2C${project.longitude}`, "_blank");
    }
  };

  return (
    <div className="pb-24 md:pb-8">
      {/* Hero Header */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-brand-600 to-brand-800 overflow-hidden">
        {project.imageUrl ? (
          <img src={project.imageUrl} alt={project.name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <HardHat className="w-32 h-32 text-white" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Back button */}
        <div className="absolute top-4 left-4">
          <button onClick={() => router.back()} className="p-2 bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={openMap} className="p-2 bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors" title="View on map">
            <Map className="w-5 h-5" />
          </button>
          {(project.latitude && project.longitude) && (
            <button onClick={getDirections} className="p-2 bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors" title="Get directions">
              <Navigation className="w-5 h-5" />
            </button>
          )}
          {(isManager || isAdmin) && (
            <button onClick={() => setUploadMediaOpen(true)} className="p-2 bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors" title="Upload photos">
              <Camera className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Project info */}
        <div className="absolute bottom-4 left-4 right-4">
          <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-full mb-2 inline-block",
            project.status === "ACTIVE" ? "bg-green-500/80 text-white" : "bg-amber-500/80 text-white")}>
            {project.status}
          </span>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white leading-tight">{project.name}</h1>
          <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
            <MapPin className="w-3.5 h-3.5" /> {project.location}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-card border-b border-border">
        <div className="grid grid-cols-4 divide-x divide-border">
          {[
            { label: "Received", value: formatCurrency(totalReceived), color: "text-green-600", sub: "" },
            { label: "Spent", value: formatCurrency(totalSpent), color: "text-red-500", sub: "" },
            { label: "Balance", value: formatCurrency(Math.abs(balance)), color: balance >= 0 ? "text-blue-600" : "text-red-500", sub: balance < 0 ? "deficit" : "surplus" },
            { label: "Purchases", value: String(project._count?.purchases || 0), color: "text-primary", sub: "items" },
          ].map(s => (
            <div key={s.label} className="p-3 text-center">
              <p className={cn("text-sm sm:text-base font-bold font-display leading-tight", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        {totalReceived > 0 && (
          <div className="px-4 pb-3">
            <div className="progress-bar">
              <motion.div className="progress-bar-fill" initial={{ width: 0 }} animate={{ width: `${Math.min(spendPct, 100)}%` }} transition={{ duration: 1, ease: "easeOut" }}
                style={{ background: spendPct > 90 ? "linear-gradient(90deg,#ef4444,#dc2626)" : spendPct > 70 ? "linear-gradient(90deg,#f59e0b,#ea580c)" : undefined }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{spendPct}% of received funds utilized</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border sticky top-16 z-20">
        <div className="flex overflow-x-auto scrollbar-hide px-4">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all",
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="page-container">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Description */}
                {project.description && (
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <h3 className="font-semibold text-sm mb-2">About This Project</h3>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  </div>
                )}
                {/* Key info */}
                <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-2 gap-4">
                  {[
                    { icon: Calendar, label: "Start Date", value: formatDate(project.startDate || project.createdAt) },
                    { icon: Calendar, label: "End Date", value: project.endDate ? formatDate(project.endDate) : "Ongoing" },
                    { icon: DollarSign, label: "Budget", value: project.budget ? formatCurrency(project.budget) : "Not set" },
                    { icon: Users, label: "Team Size", value: `${project.assignments?.filter((a: any) => a.isActive).length || 0} active` },
                    { icon: Image, label: "Photos", value: `${project._count?.images || 0} photos` },
                    { icon: FileText, label: "Requests", value: `${project._count?.requests || 0} total` },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2">
                      <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <item.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-semibold">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Map preview */}
                {project.latitude && project.longitude && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="h-48 bg-muted flex items-center justify-center relative">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${project.longitude - 0.01}%2C${project.latitude - 0.01}%2C${project.longitude + 0.01}%2C${project.latitude + 0.01}&layer=mapnik&marker=${project.latitude}%2C${project.longitude}`}
                        className="w-full h-full border-0"
                        title="Project Location"
                      />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{project.latitude.toFixed(6)}, {project.longitude.toFixed(6)}</p>
                      <button onClick={getDirections} className="text-xs text-primary flex items-center gap-1 hover:underline">
                        <Navigation className="w-3 h-3" /> Get Directions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "finances" && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-3">Money Received ({project.moneyReceived?.length})</h3>
                    {project.moneyReceived?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No funds received yet</p>
                    ) : (
                      <div className="space-y-2">
                        {project.moneyReceived?.map((rec: any) => (
                          <div key={rec.id} className="flex items-center justify-between py-2 text-sm">
                            <div>
                              <p className="font-medium">{rec.source}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(rec.receivedDate)} • {rec.paymentMethod?.replace(/_/g, " ")}</p>
                            </div>
                            <p className="font-bold text-green-600">{formatCurrency(rec.amount)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
                  {[
                    { label: "Total Received", value: totalReceived, color: "text-green-600" },
                    { label: "Total Purchases", value: project.purchases?.reduce((s: number, p: any) => s + p.totalAmount, 0) || 0, color: "text-red-500" },
                    { label: "Utilities", value: project.utilities?.reduce((s: number, u: any) => s + u.amount, 0) || 0, color: "text-amber-600" },
                    { label: "Charges", value: project.charges?.reduce((s: number, c: any) => s + c.amount, 0) || 0, color: "text-orange-600" },
                    { label: "Other Expenses", value: project.otherExpenses?.reduce((s: number, o: any) => s + o.amount, 0) || 0, color: "text-purple-600" },
                    { label: "Net Balance", value: balance, color: balance >= 0 ? "text-blue-600" : "text-red-600", bold: true },
                  ].map(row => (
                    <div key={row.label} className={cn("flex justify-between py-1.5 text-sm", row.bold && "border-t border-border mt-2 pt-2 font-bold")}>
                      <span className={row.bold ? "" : "text-muted-foreground"}>{row.label}</span>
                      <span className={cn("font-semibold", row.color)}>{formatCurrency(row.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "purchases" && (
              <div className="space-y-3">
                {project.purchases?.length === 0 ? (
                  <div className="py-12 text-center"><Receipt className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" /><p className="text-muted-foreground">No purchases yet</p></div>
                ) : project.purchases?.map((p: any) => (
                  <div key={p.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{formatDate(p.purchaseDate)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.items?.map((i: any) => i.item?.name).slice(0, 2).join(", ")}{p.items?.length > 2 ? ` +${p.items.length - 2}` : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(p.totalAmount)}</p>
                        <span className={cn("text-[10px]", p.paymentStatus === "COMPLETED" ? "badge-success" : "badge-warning")}>{p.paymentStatus}</span>
                      </div>
                    </div>
                    {p.amountDue > 0 && <p className="text-xs text-red-500 mt-1">Due: {formatCurrency(p.amountDue)}</p>}
                    {p.receipt?.fileUrl && (
                      <button onClick={() => setViewReceipt(p.receipt.fileUrl)} className="mt-2 text-xs text-blue-600 flex items-center gap-1 hover:underline">
                        <Eye className="w-3 h-3" /> View Receipt
                      </button>
                    )}
                  </div>
                ))}
                <Link href="/dashboard/purchases" className="block text-center text-xs text-primary hover:underline py-2">
                  View all purchases →
                </Link>
              </div>
            )}

            {activeTab === "expenses" && (
              <div className="space-y-4">
                {/* Quick add buttons for site managers */}
                {(isManager || isAdmin) && (
                  <div className="flex gap-2 flex-wrap">
                    <Link href="/dashboard/finances/expenses" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-brand text-white shadow-brand hover:shadow-brand-lg transition-all">
                      <Plus className="w-3.5 h-3.5" /> Add Utility / Charge / Other Expense
                    </Link>
                    <Link href="/dashboard/finances/received" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 transition-all">
                      <TrendingUp className="w-3.5 h-3.5" /> Record Money Received
                    </Link>
                  </div>
                )}

                {/* Utilities */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="font-semibold text-sm">Utilities</h3>
                    <span className="ml-auto text-xs font-bold text-amber-600">{formatCurrency(project.utilities?.reduce((s: number, u: any) => s + u.amount, 0) || 0)}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {!project.utilities?.length
                      ? <p className="text-xs text-muted-foreground text-center py-4">None recorded yet</p>
                      : project.utilities.map((u: any) => (
                        <div key={u.id} className="flex justify-between px-4 py-2.5 text-sm hover:bg-muted/30">
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(u.usageDate)} • {u.category} • {u.paymentMethod?.replace(/_/g," ")}</p>
                          </div>
                          <p className="font-bold">{formatCurrency(u.amount)}</p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Site Charges */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <h3 className="font-semibold text-sm">Site Charges</h3>
                    <span className="ml-auto text-xs font-bold text-orange-600">{formatCurrency(project.charges?.reduce((s: number, c: any) => s + c.amount, 0) || 0)}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {!project.charges?.length
                      ? <p className="text-xs text-muted-foreground text-center py-4">None recorded yet</p>
                      : project.charges.map((c: any) => (
                        <div key={c.id} className="flex justify-between px-4 py-2.5 text-sm hover:bg-muted/30">
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(c.chargeDate)} • {c.category}</p>
                          </div>
                          <p className="font-bold">{formatCurrency(c.amount)}</p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Other Expenses */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-purple-500" />
                    <h3 className="font-semibold text-sm">Other Expenses</h3>
                    <span className="ml-auto text-xs font-bold text-purple-600">{formatCurrency(project.otherExpenses?.reduce((s: number, o: any) => s + o.amount, 0) || 0)}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {!project.otherExpenses?.length
                      ? <p className="text-xs text-muted-foreground text-center py-4">None recorded yet</p>
                      : project.otherExpenses.map((o: any) => (
                        <div key={o.id} className="flex justify-between px-4 py-2.5 text-sm hover:bg-muted/30">
                          <div>
                            <p className="font-medium">{o.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(o.expenseDate)} • {o.category}</p>
                          </div>
                          <p className="font-bold">{formatCurrency(o.amount)}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "requests" && (
              <div className="space-y-3">
                {project.requests?.length === 0 ? (
                  <div className="py-12 text-center"><FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" /><p className="text-muted-foreground">No requests yet</p></div>
                ) : project.requests?.map((req: any) => (
                  <div key={req.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{req.title}</p>
                        <p className="text-xs text-muted-foreground">{req.requestedBy?.name} • {formatDate(req.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn("text-[10px]", req.status === "APPROVED" ? "badge-success" : req.status === "REJECTED" ? "badge-error" : "badge-warning")}>{req.status}</span>
                        <p className="font-bold text-sm mt-1">{formatCurrency(req.totalAmount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/requests" className="block text-center text-xs text-primary hover:underline py-2">View all requests →</Link>
              </div>
            )}

            {activeTab === "gallery" && (
              <div className="space-y-4">
                {(isManager || isAdmin) && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setUploadMediaOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-primary/30 rounded-2xl text-primary text-sm hover:border-primary hover:bg-primary/5 transition-all">
                    <Camera className="w-4 h-4" /> Upload Site Photos
                  </motion.button>
                )}
                {project.images?.length === 0 ? (
                  <div className="py-12 text-center"><Camera className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-20" /><p className="text-muted-foreground">No photos yet</p></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {project.images?.map((img: any) => (
                      <motion.div key={img.id} whileHover={{ scale: 1.02 }} className="relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer group"
                        onClick={() => setViewReceipt(img.imageUrl)}>
                        <img src={img.imageUrl} alt={img.description || "Site photo"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                          <p className="text-white text-xs font-medium line-clamp-2">{img.description || img.collectionName || formatDate(img.takenAt)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "team" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Active Team</h3>
                {project.assignments?.filter((a: any) => a.isActive).map((assignment: any) => (
                  <div key={assignment.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0", getAvatarColor(assignment.user.name))}>
                      {getInitials(assignment.user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{assignment.user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{assignment.user.role.replace(/_/g, " ").toLowerCase()}</p>
                      <p className="text-xs text-muted-foreground">Assigned: {formatDate(assignment.assignedAt)}</p>
                    </div>
                    {assignment.user.phone && (
                      <a href={`tel:${assignment.user.phone}`} className="p-2 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-xl hover:bg-green-100 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </a>
                    )}
                  </div>
                ))}
                {project.assignments?.filter((a: any) => !a.isActive).length > 0 && (
                  <>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mt-4">Previous Team</h3>
                    {project.assignments?.filter((a: any) => !a.isActive).map((assignment: any) => (
                      <div key={assignment.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 opacity-60">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0", getAvatarColor(assignment.user.name))}>
                          {getInitials(assignment.user.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{assignment.user.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(assignment.assignedAt)} – {assignment.unassignedAt ? formatDate(assignment.unassignedAt) : "—"}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {viewReceipt && <ReceiptViewModal url={viewReceipt} onClose={() => setViewReceipt("")} />}
      {uploadMediaOpen && <UploadMediaModal projectId={project.id} onClose={() => setUploadMediaOpen(false)} onSuccess={() => { setUploadMediaOpen(false); toast.success("Photos uploaded!"); router.refresh(); }} />}
    </div>
  );
}

function UploadMediaModal({ projectId, onClose, onSuccess }: { projectId: string; onClose: () => void; onSuccess: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [collectionName, setCollectionName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    Promise.all(selected.map(f => new Promise<string>(res => { const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(f); }))).then(setPreviews);
  };

  const handleSubmit = async () => {
    if (!files.length) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("collectionName", collectionName);
      fd.append("description", description);
      files.forEach(f => fd.append("images", f));
      const res = await fetch("/api/media", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-brand rounded-xl flex items-center justify-center"><Camera className="w-4 h-4 text-white" /></div>
            <h2 className="font-display font-bold">Upload Site Photos</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <label className="block w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
            <Camera className="w-8 h-8 text-muted-foreground mb-1" />
            <p className="text-sm text-muted-foreground">Click to select photos or capture</p>
            <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFiles} />
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => <img key={i} src={p} className="aspect-square rounded-lg object-cover" alt="" />)}
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Collection Name</label>
            <input value={collectionName} onChange={e => setCollectionName(e.target.value)} placeholder="e.g., Week 3 Progress" className="input-styled" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Describe what's shown..." className="input-styled resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
            <motion.button onClick={handleSubmit} disabled={!files.length || loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera className="w-4 h-4" />}
              {loading ? "Uploading..." : `Upload ${files.length} Photo${files.length !== 1 ? "s" : ""}`}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
