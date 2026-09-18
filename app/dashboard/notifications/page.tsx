"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Plus, CheckCheck, X, Loader2, AlertCircle,
  AlertTriangle, Info, Send, Users, Building2, ChevronLeft, ChevronRight
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { cn, formatRelative } from "@/lib/utils";
import { useSession } from "next-auth/react";

const PRIORITY_ICON: Record<string, any> = { URGENT: AlertCircle, HIGH: AlertTriangle, MEDIUM: Info, LOW: Info };
const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "text-red-500", HIGH: "text-orange-500", MEDIUM: "text-blue-500", LOW: "text-muted-foreground",
};

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [sendOpen, setSendOpen] = useState(false);
  const queryClient = useQueryClient();
  const isAdmin = session?.user?.role === "SYSTEM_ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-page", page],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?page=${page}&limit=20`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => { await fetch("/api/notifications/read-all", { method: "POST" }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications-page"] }); queryClient.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/notifications/${id}/read`, { method: "POST" }); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-page"] }),
  });

  const notifications = data?.notifications || [];
  const pagination = data?.pagination;
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {pagination?.total || 0} total{unreadCount > 0 && <span className="text-primary ml-1">• {unreadCount} unread</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={() => markAllRead.mutate()} className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border border-border hover:bg-muted transition-colors">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          {isAdmin && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSendOpen(true)}
              className="btn-brand flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Send Notification
            </motion.button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
          : notifications.length === 0 ? (
            <div className="py-20 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : notifications.map((notif: any) => {
            const Icon = PRIORITY_ICON[notif.notification.priority] || Info;
            return (
              <motion.div key={notif.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={cn("bg-card border rounded-2xl p-4 flex gap-3 cursor-pointer hover:shadow-card transition-all", notif.isRead ? "border-border" : "border-primary/30 bg-primary/3")}>
                <div className="flex-shrink-0 mt-0.5">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", notif.isRead ? "bg-muted" : "bg-primary/10")}>
                    <Icon className={cn("w-4 h-4", notif.isRead ? "text-muted-foreground" : PRIORITY_COLOR[notif.notification.priority])} />
                  </div>
                </div>
                <div className="flex-1 min-w-0" onClick={() => !notif.isRead && markRead.mutate(notif.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-semibold", notif.isRead ? "text-foreground/80" : "text-foreground")}>
                      {notif.notification.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notif.isRead && <span className="w-2 h-2 bg-primary rounded-full" />}
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", {
                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400": notif.notification.priority === "URGENT",
                        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400": notif.notification.priority === "HIGH",
                        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400": notif.notification.priority === "MEDIUM",
                        "badge-info": notif.notification.priority === "LOW",
                      })}>
                        {notif.notification.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notif.notification.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <p className="text-[10px] text-muted-foreground">{formatRelative(notif.notification.createdAt)}</p>
                    {notif.notification.project && (
                      <p className="text-[10px] text-primary flex items-center gap-1">
                        <Building2 className="w-3 h-3" />{notif.notification.project.name}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">From: {notif.notification.sentBy?.name}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {sendOpen && isAdmin && (
        <SendNotificationModal onClose={() => setSendOpen(false)} onSuccess={() => { setSendOpen(false); queryClient.invalidateQueries({ queryKey: ["notifications-page"] }); toast.success("Notification sent!"); }} />
      )}
    </div>
  );
}

function SendNotificationModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<"all" | "project" | "user">("all");
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { register, handleSubmit, watch } = useForm({
    defaultValues: { title: "", message: "", priority: "MEDIUM", projectId: "", userIds: [] as string[], isGlobal: true },
  });

  useState(() => {
    fetch("/api/projects?limit=50").then(r => r.json()).then(d => setProjects(d.projects || []));
    fetch("/api/users?limit=50").then(r => r.json()).then(d => setUsers(d.users || []));
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const payload = {
        title: data.title, message: data.message, priority: data.priority,
        isGlobal: target === "all",
        projectId: target === "project" ? data.projectId : undefined,
        userIds: target === "user" ? [data.userIds] : undefined,
      };
      const res = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
            <div className="w-9 h-9 bg-gradient-brand rounded-xl flex items-center justify-center"><Bell className="w-4 h-4 text-white" /></div>
            <h2 className="font-display font-bold">Send Notification</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Recipients */}
          <div>
            <label className="text-sm font-medium mb-2 block">Send To</label>
            <div className="flex gap-2">
              {[["all","Everyone"], ["project","Project"], ["user","Specific User"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setTarget(v as any)}
                  className={cn("flex-1 py-2 rounded-xl text-xs font-medium border transition-all", target === v ? "bg-primary text-white border-primary" : "border-border hover:border-primary")}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {target === "project" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Project</label>
              <select {...register("projectId")} className="input-styled">
                <option value="">Select project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          {target === "user" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">User</label>
              <select {...register("userIds")} className="input-styled">
                <option value="">Select user</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Title *</label>
            <input {...register("title", { required: true })} placeholder="Notification title" className="input-styled" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Message *</label>
            <textarea {...register("message", { required: true })} rows={3} placeholder="Write your message..." className="input-styled resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Priority</label>
            <select {...register("priority")} className="input-styled">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Sending..." : "Send"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
