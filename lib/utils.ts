import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, symbol = "UGX"): string {
  if (isNaN(amount)) return `${symbol} 0`;
  return `${symbol} ${new Intl.NumberFormat("en-UG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, HH:mm");
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(text: string, length = 50): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "badge-success", COMPLETED: "badge-info", PENDING: "badge-warning",
    APPROVED: "badge-success", REJECTED: "badge-error", PLANNING: "badge-info",
    ON_HOLD: "badge-warning", CANCELLED: "badge-error", PARTIAL: "badge-warning",
  };
  return colors[status] || "badge-info";
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SYSTEM_ADMIN: "System Admin", SITE_MANAGER: "Site Manager", ACCOUNTANT: "Accountant",
  };
  return labels[role] || role;
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    SYSTEM_ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    SITE_MANAGER: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    ACCOUNTANT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return colors[role] || "bg-gray-100 text-gray-700";
}

export function isPast24Hours(date: Date | string): boolean {
  const created = new Date(date);
  const now = new Date();
  return now.getTime() - created.getTime() > 24 * 60 * 60 * 1000;
}

export function isValidPhone(phone: string): boolean {
  const ugandaPhone = /^(\+256|0)(7[0-9]|4[5-9])[0-9]{7}$/;
  return ugandaPhone.test(phone.replace(/\s/g, ""));
}

export function formatPhoneForApi(phone: string): string {
  const cleaned = phone.replace(/\s|-/g, "");
  if (cleaned.startsWith("0")) return "+256" + cleaned.slice(1);
  if (cleaned.startsWith("256")) return "+" + cleaned;
  return cleaned;
}

export function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500",
  ];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

export function getAuditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATE: "Created", UPDATE: "Updated", DELETE: "Deleted",
    LOGIN: "Logged In", LOGOUT: "Logged Out", APPROVE: "Approved",
    REJECT: "Rejected", ASSIGN: "Assigned", UNASSIGN: "Unassigned",
    SEND_MONEY: "Sent Money", VIEW: "Viewed", DOWNLOAD: "Downloaded", UPLOAD: "Uploaded",
  };
  return labels[action] || action;
}
