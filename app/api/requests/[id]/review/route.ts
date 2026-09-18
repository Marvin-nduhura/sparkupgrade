import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN", "ACCOUNTANT");
    const { status, notes } = await req.json();

    if (!["APPROVED", "REJECTED", "REVIEWED", "PARTIALLY_APPROVED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const request = await prisma.request.findUnique({ where: { id: params.id }, include: { requestedBy: { select: { id: true, name: true } } } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.request.update({
      where: { id: params.id },
      data: { status: status as any, reviewedById: session!.user.id, reviewedAt: new Date(), reviewNotes: notes },
    });

    // Notify the requester
    const notification = await prisma.notification.create({
      data: {
        title: `Request ${status === "APPROVED" ? "✅ Approved" : status === "REJECTED" ? "❌ Rejected" : "👁️ Reviewed"}`,
        message: `Your request "${request.title}" has been ${status.toLowerCase()}.${notes ? ` Notes: ${notes}` : ""}`,
        priority: status === "APPROVED" ? "HIGH" : "MEDIUM",
        projectId: request.projectId,
        sentById: session!.user.id,
      },
    });
    await prisma.userNotification.create({ data: { userId: request.requestedBy.id, notificationId: notification.id } });

    await createAuditLog({
      userId: session!.user.id,
      projectId: request.projectId,
      action: status === "APPROVED" ? "APPROVE" : "REJECT",
      resource: "Request",
      resourceId: params.id,
      details: { status, notes },
    });

    return NextResponse.json(updated);
  } catch (err) { return handleApiError(err); }
}
