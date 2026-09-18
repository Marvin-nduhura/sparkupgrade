export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN");
    const { userId, assign } = await req.json();

    if (assign) {
      const existing = await prisma.projectAssignment.findFirst({
        where: { projectId: params.id, userId, isActive: true },
      });
      if (existing) return NextResponse.json({ error: "User already assigned to this project" }, { status: 409 });

      const previous = await prisma.projectAssignment.findFirst({
        where: { projectId: params.id, userId, isActive: false },
      });
      if (previous) {
        await prisma.projectAssignment.update({
          where: { id: previous.id },
          data: { isActive: true, unassignedAt: null, assignedAt: new Date() },
        });
      } else {
        await prisma.projectAssignment.create({
          data: { projectId: params.id, userId, assignedBy: session!.user.id },
        });
      }

      const project = await prisma.project.findUnique({ where: { id: params.id }, select: { name: true } });
      const notification = await prisma.notification.create({
        data: {
          title: "📋 New Project Assignment",
          message: `You have been assigned to project: ${project?.name}. Check your projects dashboard.`,
          priority: "HIGH",
          projectId: params.id,
          sentById: session!.user.id,
        },
      });
      await prisma.userNotification.create({ data: { userId, notificationId: notification.id } });
      await createAuditLog({ userId: session!.user.id, projectId: params.id, action: "ASSIGN", resource: "ProjectAssignment", details: { assignedUserId: userId } });
    } else {
      await prisma.projectAssignment.updateMany({
        where: { projectId: params.id, userId, isActive: true },
        data: { isActive: false, unassignedAt: new Date() },
      });
      const notification = await prisma.notification.create({
        data: { title: "📋 Project Unassignment", message: "You have been unassigned from a project.", priority: "MEDIUM", sentById: session!.user.id },
      });
      await prisma.userNotification.create({ data: { userId, notificationId: notification.id } });
      await createAuditLog({ userId: session!.user.id, projectId: params.id, action: "UNASSIGN", resource: "ProjectAssignment", details: { unassignedUserId: userId } });
    }

    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
