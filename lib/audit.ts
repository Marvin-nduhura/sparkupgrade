import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

interface AuditParams {
  userId?: string;
  projectId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        projectId: params.projectId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: params.details || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}

export function getAuditActionLabel(action: AuditAction): string {
  const labels: Record<string, string> = {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
    LOGIN: "Logged In",
    LOGOUT: "Logged Out",
    APPROVE: "Approved",
    REJECT: "Rejected",
    ASSIGN: "Assigned",
    UNASSIGN: "Unassigned",
    SEND_MONEY: "Sent Money",
    VIEW: "Viewed",
    DOWNLOAD: "Downloaded",
    UPLOAD: "Uploaded",
  };
  return labels[action] || action;
}
