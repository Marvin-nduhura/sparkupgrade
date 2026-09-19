"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, User, Shield, Building2, Clock, Check,
  Edit2, X, Loader2, Key, UserCheck, UserX
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cn, formatDateTime, getInitials, getAvatarColor,
  getRoleLabel, getRoleColor, getAuditActionLabel
} from "@/lib/utils";

const ALL_PERMISSIONS = [
  "manage_projects", "delete_projects", "assign_managers",
  "view_finances", "manage_finances", "send_money",
  "view_reports", "download_reports",
  "manage_inventory", "manage_purchases",
  "manage_requests", "approve_requests",
  "view_audit_logs", "manage_users",
  "send_notifications", "view_analytics",
  "bypass_edit_lock",
];

export function UserDetailContent({ user, auditLogs }: { user: any; auditLogs: any[] }) {
  const [activeTab, setActiveTab] = useState<"overview" | "permissions" | "activity">("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [resetPassOpen, setResetPassOpen] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    Object.fromEntries(user.permissions.map((p: any) => [p.permission, p.granted]))
  );
  const [savingPerms, setSavingPerms] = useState(false);
  const router = useRouter();

  const togglePermission = (perm: string) => {
    setPermissions(prev => ({ ...prev, [perm]: !prev[perm] }));
  };

  const savePermissions = async () => {
    setSavingPerms(true);
    try {
      const permsArray = Object.entries(permissions).map(([permission, granted]) => ({ permission, granted }));
      const res = await fetch(`/api/users/${user.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permsArray }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Permissions saved!");
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingPerms(false); }
  };

  const toggleActive = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`User ${user.isActive ? "deactivated" : "activated"}!`);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="page-container pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg", getAvatarColor(user.name))}>
            {getInitials(user.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-display font-bold">{user.name}</h1>
              <span className={cn("w-2.5 h-2.5 rounded-full", user.isActive ? "bg-green-500" : "bg-red-400")} />
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getRoleColor(user.role))}>{getRoleLabel(user.role)}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => setResetPassOpen(true)} className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 hover:bg-amber-100 transition-colors"><Key className="w-4 h-4" /></button>
          <button onClick={toggleActive} className={cn("p-2 rounded-xl transition-colors", user.isActive ? "bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100" : "bg-green-50 dark:bg-green-950/20 text-green-600 hover:bg-green-100")}>
            {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6 w-fit">
        {(["overview", "permissions", "activity"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all", activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

          {activeTab === "overview" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Contact Info</h3>
                {[
                  { label: "Email", value: user.email },
                  { label: "Phone", value: user.phone || "Not set" },
                  { label: "MTN Money", value: user.mtnNumber || "Not set" },
                  { label: "Airtel Money", value: user.airtelNumber || "Not set" },
                  { label: "Bank", value: user.bankName ? `${user.bankName} – ${user.bankAccount}` : "Not set" },
                  { label: "Last Login", value: user.lastLogin ? formatDateTime(user.lastLogin) : "Never" },
                  { label: "Member Since", value: formatDateTime(user.createdAt) },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-right max-w-[60%] truncate">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Assigned Projects</h3>
                {user.managedProjects?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects assigned</p>
                ) : (
                  <div className="space-y-2">
                    {user.managedProjects.map((a: any) => (
                      <div key={a.id} className={cn("flex items-center gap-2 p-2.5 rounded-xl text-sm", a.isActive ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/50 opacity-60")}>
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{a.project.name}</p>
                          <p className="text-[10px] text-muted-foreground">{a.project.location}</p>
                        </div>
                        <span className={cn("text-[10px] font-bold", a.isActive ? "text-green-600" : "text-muted-foreground")}>{a.isActive ? "Active" : "Ended"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Permission Overrides</h3>
                  <p className="text-xs text-muted-foreground">These override role defaults for this user</p>
                </div>
                <motion.button onClick={savePermissions} disabled={savingPerms} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="btn-brand flex items-center gap-2 text-sm">
                  {savingPerms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save
                </motion.button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map(perm => (
                  <div key={perm} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <span className="text-sm capitalize">{perm.replace(/_/g, " ")}</span>
                    <button onClick={() => togglePermission(perm)}
                      className={cn("relative w-10 h-6 rounded-full transition-all duration-200", permissions[perm] ? "bg-primary" : "bg-muted-foreground/30")}>
                      <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200", permissions[perm] ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold">Recent Activity</h3>
                <p className="text-xs text-muted-foreground">Last 20 actions by this user</p>
              </div>
              <div className="divide-y divide-border">
                {auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">No activity recorded</div>
                ) : auditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm"><span className="font-medium">{getAuditActionLabel(log.action)}</span> {log.resource}{log.project ? ` on ${log.project.name}` : ""}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(log.createdAt)}</p>
                    </div>
                    <span className={cn("text-[10px] flex-shrink-0", log.action === "CREATE" ? "badge-success" : log.action === "DELETE" ? "badge-error" : log.action === "LOGIN" ? "badge-info" : "badge-warning")}>{log.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {editOpen && <EditUserQuickModal user={user} onClose={() => setEditOpen(false)} onSuccess={() => { setEditOpen(false); router.refresh(); }} />}
      {resetPassOpen && <ResetPasswordModal userId={user.id} onClose={() => setResetPassOpen(false)} />}
    </div>
  );
}

function EditUserQuickModal({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({ defaultValues: { name: user.name, role: user.role, phone: user.phone || "", mtnNumber: user.mtnNumber || "", airtelNumber: user.airtelNumber || "" } });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("User updated!"); onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">Edit User</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">Full Name</label><input {...register("name")} className="input-styled" /></div>
          <div><label className="text-sm font-medium mb-1.5 block">Role</label>
            <select {...register("role")} className="input-styled">
              <option value="SITE_MANAGER">Site Manager</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="SYSTEM_ADMIN">System Admin</option>
            </select>
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Phone</label><input {...register("phone")} className="input-styled" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium mb-1.5 block">MTN Number</label><input {...register("mtnNumber")} className="input-styled text-sm" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Airtel Number</label><input {...register("airtelNumber")} className="input-styled text-sm" /></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Save
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ResetPasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<{ newPassword: string; confirmPassword: string }>();

  const onSubmit = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: data.newPassword }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Password reset successfully!"); onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center"><Key className="w-4 h-4 text-white" /></div>
            <h2 className="font-display font-bold">Reset Password</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block">New Password</label>
            <input {...register("newPassword", { required: true, minLength: { value: 8, message: "Min 8 characters" } })} type="password" className="input-styled" />
            {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
          </div>
          <div><label className="text-sm font-medium mb-1.5 block">Confirm Password</label>
            <input {...register("confirmPassword", { required: true })} type="password" className="input-styled" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 bg-amber-500 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-amber-600">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}Reset
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
