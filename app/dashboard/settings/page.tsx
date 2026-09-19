"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, User, Palette, Bell, Shield, Building2, CreditCard,
  Eye, EyeOff, Save, Loader2, Moon, Sun, Monitor, Check,
  Phone, Mail, Lock, Camera, Upload, X, LogOut
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn, getInitials, getAvatarColor } from "@/lib/utils";
import { useRef } from "react";

const THEMES = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];
const COLOR_SCHEMES = [
  { id: "orange", label: "Orange", color: "bg-orange-500" },
  { id: "blue", label: "Blue", color: "bg-blue-500" },
  { id: "green", label: "Green", color: "bg-green-500" },
  { id: "purple", label: "Purple", color: "bg-purple-500" },
  { id: "red", label: "Red", color: "bg-red-500" },
];

const TABS = ["Profile", "Security", "Appearance", "Notifications", "Payment Accounts"];
const ADMIN_TABS = [...TABS, "Company Settings"];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState("Profile");
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const isAdmin = session?.user?.role === "SYSTEM_ADMIN";
  const tabs = isAdmin ? ADMIN_TABS : TABS;

  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </motion.button>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="sm:w-48 flex-shrink-0">
          <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible scrollbar-hide bg-card border border-border rounded-2xl p-2">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all text-left w-full",
                  activeTab === tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {activeTab === "Profile" && <ProfileTab session={session} onUpdate={update} />}
              {activeTab === "Security" && <SecurityTab />}
              {activeTab === "Appearance" && <AppearanceTab theme={theme} setTheme={setTheme} />}
              {activeTab === "Notifications" && <NotificationsTab />}
              {activeTab === "Payment Accounts" && <PaymentAccountsTab session={session} />}
              {activeTab === "Company Settings" && isAdmin && <CompanySettingsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ session, onUpdate }: any) {
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit } = useForm({ defaultValues: { name: session?.user?.name || "", phone: "" } });

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onloadend = () => setAvatarPreview(r.result as string);
    r.readAsDataURL(file);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => v && fd.append(k, v as string));
      if (fileRef.current?.files?.[0]) fd.append("avatar", fileRef.current.files[0]);
      const res = await fetch("/api/profile", { method: "PATCH", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      await onUpdate();
      toast.success("Profile updated!");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <h3 className="font-display font-semibold">Profile Information</h3>
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold relative overflow-hidden", getAvatarColor(session?.user?.name || "U"))}>
          {(avatarPreview || session?.user?.image) ? (
            <img src={avatarPreview || session?.user?.image} alt="" className="w-full h-full object-cover" />
          ) : getInitials(session?.user?.name || "User")}
          <button onClick={() => fileRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </button>
        </div>
        <div>
          <p className="font-semibold">{session?.user?.name}</p>
          <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:underline mt-1">Change photo</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div><label className="text-sm font-medium mb-1.5 block">Full Name</label>
          <input {...register("name")} className="input-styled" />
        </div>
        <div><label className="text-sm font-medium mb-1.5 block">Email</label>
          <input value={session?.user?.email || ""} disabled className="input-styled opacity-60 cursor-not-allowed" />
          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
        </div>
        <div><label className="text-sm font-medium mb-1.5 block">Phone</label>
          <input {...register("phone")} placeholder="+256 7XX XXX XXX" className="input-styled" />
        </div>
        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-brand flex items-center gap-2 text-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </motion.button>
      </form>
    </div>
  );
}

function SecurityTab() {
  const [loading, setLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ oldPassword: string; newPassword: string; confirmPassword: string }>();

  const onSubmit = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/profile/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Password updated!"); reset();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <h3 className="font-display font-semibold">Change Password</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
        <div><label className="text-sm font-medium mb-1.5 block">Current Password</label>
          <div className="relative">
            <input {...register("oldPassword", { required: true })} type={showOld ? "text" : "password"} className="input-styled pr-10" />
            <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div><label className="text-sm font-medium mb-1.5 block">New Password</label>
          <div className="relative">
            <input {...register("newPassword", { required: true, minLength: { value: 8, message: "Min 8 characters" } })} type={showNew ? "text" : "password"} className="input-styled pr-10" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
        </div>
        <div><label className="text-sm font-medium mb-1.5 block">Confirm New Password</label>
          <input {...register("confirmPassword", { required: true })} type="password" className="input-styled" />
        </div>
        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-brand flex items-center gap-2 text-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Update Password
        </motion.button>
      </form>
    </div>
  );
}

function AppearanceTab({ theme, setTheme }: { theme: string | undefined; setTheme: (t: string) => void }) {
  const [colorScheme, setColorScheme] = useState("orange");

  const applyColorScheme = (scheme: string) => {
    setColorScheme(scheme);
    document.documentElement.className = document.documentElement.className.replace(/theme-\w+/g, "");
    if (scheme !== "orange") document.documentElement.classList.add(`theme-${scheme}`);
    toast.success(`Theme updated to ${scheme}!`);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <h3 className="font-display font-semibold">Appearance</h3>
      <div>
        <p className="text-sm font-medium mb-3">Theme Mode</p>
        <div className="flex gap-3">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={cn("flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", theme === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <t.icon className={cn("w-5 h-5", theme === t.id ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs font-medium">{t.label}</span>
              {theme === t.id && <Check className="w-3 h-3 text-primary" />}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-3">Accent Color</p>
        <div className="flex gap-3 flex-wrap">
          {COLOR_SCHEMES.map(c => (
            <button key={c.id} onClick={() => applyColorScheme(c.id)}
              className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all", colorScheme === c.id ? "border-current" : "border-border hover:border-current/50")}>
              <span className={cn("w-4 h-4 rounded-full", c.color)} />
              <span className="text-sm">{c.label}</span>
              {colorScheme === c.id && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({ email: true, push: true, sms: false, requests: true, payments: true, assignments: true });
  const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <h3 className="font-display font-semibold">Notification Preferences</h3>
      <div className="space-y-4">
        {[
          { key: "email", label: "Email Notifications", desc: "Receive notifications via email" },
          { key: "push", label: "Push Notifications", desc: "Browser & mobile push notifications" },
          { key: "requests", label: "Request Updates", desc: "When your requests are approved/rejected" },
          { key: "payments", label: "Payment Alerts", desc: "When money is sent or received" },
          { key: "assignments", label: "Project Assignments", desc: "When you're assigned to a project" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
            <div>
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <button onClick={() => toggle(item.key as any)}
              className={cn("relative w-10 h-6 rounded-full transition-all duration-200", prefs[item.key as keyof typeof prefs] ? "bg-primary" : "bg-muted")}>
              <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200", prefs[item.key as keyof typeof prefs] ? "translate-x-4" : "translate-x-0")} />
            </button>
          </div>
        ))}
      </div>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => toast.success("Preferences saved!")} className="btn-brand flex items-center gap-2 text-sm">
        <Save className="w-4 h-4" /> Save Preferences
      </motion.button>
    </div>
  );
}

function PaymentAccountsTab({ session }: any) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({ defaultValues: { mtnNumber: "", airtelNumber: "", bankName: "", bankAccount: "" } });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${session?.user?.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Payment accounts updated!");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <h3 className="font-display font-semibold">Payment Accounts</h3>
      <p className="text-sm text-muted-foreground">Set up your mobile money and bank accounts to receive payments.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
        <div><label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
          <span className="w-4 h-4 bg-yellow-400 rounded-full" />MTN Mobile Money</label>
          <input {...register("mtnNumber")} placeholder="+256 77X XXX XXX" className="input-styled" />
        </div>
        <div><label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
          <span className="w-4 h-4 bg-red-500 rounded-full" />Airtel Money</label>
          <input {...register("airtelNumber")} placeholder="+256 75X XXX XXX" className="input-styled" />
        </div>
        <div className="border-t border-border pt-4"><label className="text-sm font-medium mb-1.5 block">Bank Name</label>
          <input {...register("bankName")} placeholder="e.g., Stanbic Bank" className="input-styled" />
        </div>
        <div><label className="text-sm font-medium mb-1.5 block">Bank Account Number</label>
          <input {...register("bankAccount")} placeholder="Account number" className="input-styled" />
        </div>
        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-brand flex items-center gap-2 text-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Save Accounts
        </motion.button>
      </form>
    </div>
  );
}

function CompanySettingsTab() {
  const [loading, setLoading] = useState(false);
  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => { const r = await fetch("/api/settings"); return r.json(); },
  });

  const { register, handleSubmit } = useForm({ values: settings || {} });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Company settings saved!");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <h3 className="font-display font-semibold">Company Settings</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium mb-1.5 block">Company Name</label>
            <input {...register("companyName")} className="input-styled" /></div>
          <div><label className="text-sm font-medium mb-1.5 block">Phone</label>
            <input {...register("phone")} className="input-styled" /></div>
          <div><label className="text-sm font-medium mb-1.5 block">Email</label>
            <input {...register("email")} type="email" className="input-styled" /></div>
          <div><label className="text-sm font-medium mb-1.5 block">Currency</label>
            <input {...register("currency")} className="input-styled" /></div>
        </div>
        <div><label className="text-sm font-medium mb-1.5 block">Address</label>
          <input {...register("address")} className="input-styled" /></div>
        <div className="border-t border-border pt-4">
          <p className="font-medium text-sm mb-3">Mobile Money Numbers</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">MTN Number</label>
              <input {...register("mtnNumber")} className="input-styled" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Airtel Number</label>
              <input {...register("airtelNumber")} className="input-styled" /></div>
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <p className="font-medium text-sm mb-3">Bank Accounts</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1.5 block">Bank 1 Name</label>
              <input {...register("bankName1")} className="input-styled" /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Account 1</label>
              <input {...register("bankAccount1")} className="input-styled" /></div>
          </div>
        </div>
        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-brand flex items-center gap-2 text-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </motion.button>
      </form>
    </div>
  );
}
