import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { isPast24Hours } from "@/lib/utils";

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SYSTEM_ADMIN: ["*"],
  SITE_MANAGER: [
    "manage_projects",
    "manage_inventory",
    "manage_purchases",
    "manage_requests",
    "view_reports",
    "download_reports",
    "view_analytics",
    "view_finances",
    "manage_finances",
  ],
  ACCOUNTANT: [
    "view_finances",
    "manage_finances",
    "view_reports",
    "download_reports",
    "manage_requests",
    "approve_requests",
    "view_analytics",
    "manage_inventory",
  ],
};

export async function getAssignedProjectIds(userId: string): Promise<string[]> {
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId, isActive: true },
    select: { projectId: true },
  });
  return assignments.map((a) => a.projectId);
}

/** Returns assigned project IDs for site managers, or null when the user can see all projects. */
export async function scopedProjectIds(session: { user: { id: string; role: string } }): Promise<string[] | null> {
  if (session.user.role === "SITE_MANAGER") {
    return getAssignedProjectIds(session.user.id);
  }
  return null;
}

export function projectIdFilter(ids: string[] | null, extraId?: string) {
  if (ids) {
    if (extraId) return ids.includes(extraId) ? extraId : "__none__";
    return { in: ids };
  }
  return extraId || undefined;
}

export async function userHasPermission(
  userId: string,
  role: string,
  permission: string
): Promise<boolean> {
  if (role === "SYSTEM_ADMIN") return true;

  const override = await prisma.userPermission.findUnique({
    where: { userId_permission: { userId, permission } },
  });
  if (override) return override.granted;

  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function assertPermission(session: any, permission: string) {
  if (!session?.user) throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
  const ok = await userHasPermission(session.user.id, session.user.role, permission);
  if (!ok) {
    throw new AppError("You don't have permission to perform this action.", 403, "FORBIDDEN");
  }
}

export async function assertEditWindow(session: any, createdAt: Date | string) {
  if (!session?.user) throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
  if (session.user.role === "SYSTEM_ADMIN") return;

  const bypass = await userHasPermission(session.user.id, session.user.role, "bypass_edit_lock");
  if (bypass) return;

  if (session.user.role === "SITE_MANAGER" && isPast24Hours(createdAt)) {
    throw new AppError(
      "Edit window has expired. Records can only be changed within 24 hours unless an administrator grants you an override.",
      403,
      "EDIT_LOCKED"
    );
  }
}
