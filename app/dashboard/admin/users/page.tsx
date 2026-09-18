"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Search, Edit2, Trash2, Shield, X, Loader2,
  UserCheck, UserX, Key, Building2, ChevronLeft, ChevronRight,
  Phone, Mail, Crown, HardHat, Calculator
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn, formatDateTime, getInitials, getAvatarColor, getRoleLabel, getRoleColor } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "Min 8 characters"),
  role: z.enum(["SYSTEM_ADMIN", "SITE_MANAGER", "ACCOUNTANT"]),
  phone: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const roleIcons = { SYSTEM_ADMIN: Crown, SITE_MANAGER: HardHat, ACCOUNTANT: Calculator };

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [permissionsUser, setPermissionsUser] = useState<any>(null);
  const [assignUser, setAssignUser] = useState<any>(null);
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", debouncedSearch, roleFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (roleFilter) params.set("role", roleFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/users?${params}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateForm) => {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("User created!"); setCreateOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("User status updated!"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Cannot delete user");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("User deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const users = data?.users || [];
  const pagination = data?.pagination;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { role: "SITE_MANAGER" } });

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} users in the system</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setCreateOpen(true)} className="btn-brand flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Create User
        </motion.button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email..." className="input-styled pl-10" />
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {[["", "All"], ["SYSTEM_ADMIN", "Admin"], ["SITE_MANAGER", "Manager"], ["ACCOUNTANT", "Accountant"]].map(([v, l]) => (
            <button key={v} onClick={() => setRoleFilter(v)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all", roleFilter === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />) :
          users.map((user: any, i: number) => {
            const RoleIcon = roleIcons[user.role as keyof typeof roleIcons] || Users;
            return (
              <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-4 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm", getAvatarColor(user.name))}>
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{user.name}</p>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", getRoleColor(user.role))}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </div>
                  <div className={cn("w-2.5 h-2.5 rounded-full mt-1", user.isActive ? "bg-green-500" : "bg-red-400")} title={user.isActive ? "Active" : "Inactive"} />
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {user.email}</p>
                  {user.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {user.phone}</p>}
                  {user.lastLogin && <p className="flex items-center gap-1.5"><UserCheck className="w-3 h-3" /> Last login: {formatDateTime(user.lastLogin)}</p>}
                  {user.managedProjects?.length > 0 && (
                    <p className="flex items-center gap-1.5"><Building2 className="w-3 h-3" />
                      {user.managedProjects.map((a: any) => a.project.name).join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex gap-1.5 mt-3 flex-wrap">
                  <button onClick={() => setEditUser(user)} className="flex-1 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg flex items-center justify-center gap-1 transition-colors">
                    <Edit2 className="w-3 h-3" />Edit
                  </button>
                  <button onClick={() => setPermissionsUser(user)} className="flex-1 py-1.5 text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-1 transition-colors">
                    <Shield className="w-3 h-3" />Perms
                  </button>
                  <button onClick={() => setAssignUser(user)} className="flex-1 py-1.5 text-xs bg-brand-50 dark:bg-brand-950/20 text-brand-600 hover:bg-brand-100 rounded-lg flex items-center justify-center gap-1 transition-colors">
                    <Building2 className="w-3 h-3" />Assign
                  </button>
                  <button onClick={() => toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive })} className={cn("py-1.5 px-2 text-xs rounded-lg flex items-center gap-1 transition-colors", user.isActive ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 hover:bg-amber-100" : "bg-green-50 dark:bg-green-950/20 text-green-600 hover:bg-green-100")}>
                    {user.isActive ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                  </button>
                  <button onClick={() => { if (confirm(`Delete user ${user.name}?`)) deleteMutation.mutate(user.id); }} className="py-1.5 px-2 text-xs bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
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

      {/* Create User Modal */}
      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
              <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-brand rounded-xl flex items-center justify-center"><Users className="w-4 h-4 text-white" /></div>
                  <h2 className="font-display font-bold">Create User Account</h2>
                </div>
                <button onClick={() => setCreateOpen(false)} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Full Name *</label>
                  <input {...register("name")} placeholder="John Mukasa" className="input-styled" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email Address *</label>
                  <input {...register("email")} type="email" placeholder="john@sparkconst.co.ug" className="input-styled" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Role *</label>
                  <select {...register("role")} className="input-styled">
                    <option value="SITE_MANAGER">Site Manager</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="SYSTEM_ADMIN">System Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
                  <input {...register("phone")} placeholder="+256 7XX XXX XXX" className="input-styled" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Temporary Password *</label>
                  <input {...register("password")} type="password" placeholder="Min 8 characters" className="input-styled" />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">User can change this after first login</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setCreateOpen(false)} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
                  <motion.button type="submit" disabled={createMutation.isPending} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create User
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit + Assign modals */}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSuccess={() => { setEditUser(null); queryClient.invalidateQueries({ queryKey: ["users"] }); }} />}
      {assignUser && <AssignProjectModal user={assignUser} onClose={() => setAssignUser(null)} onSuccess={() => { setAssignUser(null); queryClient.invalidateQueries({ queryKey: ["users"] }); }} />}
    </div>
  );
}

function EditUserModal({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: () => void }) {
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
          <h2 className="font-display font-bold">Edit User: {user.name}</h2>
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
            <div><label className="text-sm font-medium mb-1.5 block">MTN Number</label><input {...register("mtnNumber")} placeholder="+256 77X XXX XXX" className="input-styled text-sm" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Airtel Number</label><input {...register("airtelNumber")} placeholder="+256 75X XXX XXX" className="input-styled text-sm" /></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm hover:bg-muted">Cancel</button>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 btn-brand py-3 text-sm flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}Save Changes
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AssignProjectModal({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const { data: projectsData } = useQuery({ queryKey: ["projects-list"], queryFn: async () => { const res = await fetch("/api/projects?limit=50"); return res.json(); } });

  const assign = async (projectId: string, assign: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, assign }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(assign ? "User assigned to project!" : "User unassigned from project!");
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const currentProjects = user.managedProjects?.map((a: any) => a.project) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold">Assign Projects – {user.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {currentProjects.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Currently Assigned:</p>
              <div className="space-y-1.5">
                {currentProjects.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-green-50 dark:bg-green-950/20 rounded-xl">
                    <span className="text-sm font-medium">{p.name}</span>
                    <button onClick={() => assign(p.id, false)} className="text-xs text-red-500 hover:text-red-700 font-medium">Unassign</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-medium mb-2">Assign to Project:</p>
            <div className="flex gap-2">
              <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="input-styled flex-1">
                <option value="">Select project...</option>
                {(projectsData?.projects || []).filter((p: any) => !currentProjects.find((cp: any) => cp.id === p.id)).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <motion.button onClick={() => selectedProject && assign(selectedProject, true)} disabled={!selectedProject || loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-brand px-4 text-sm disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
