export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireAuth } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireAuth(session);

    const request = await prisma.request.findUnique({
      where: { id: params.id },
      include: {
        project: { select: { name: true, location: true } },
        requestedBy: { select: { name: true, avatar: true } },
        items: true,
      },
    });
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    return NextResponse.json(request);
  } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireAuth(session);

    const request = await prisma.request.findUnique({ where: { id: params.id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only the requester or admin/accountant can edit
    if (session!.user.role === "SITE_MANAGER" && request.requestedById !== session!.user.id) {
      return NextResponse.json({ error: "You can only edit your own requests." }, { status: 403 });
    }
    if (session!.user.role === "SITE_MANAGER" && request.status !== "PENDING") {
      return NextResponse.json({ error: "Cannot edit a request that has been reviewed." }, { status: 400 });
    }

    const body = await req.json();
    const updated = await prisma.request.update({
      where: { id: params.id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.totalAmount !== undefined && { totalAmount: body.totalAmount }),
      },
    });

    await createAuditLog({ userId: session!.user.id, action: "UPDATE", resource: "Request", resourceId: params.id });
    return NextResponse.json(updated);
  } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireAuth(session);

    const request = await prisma.request.findUnique({ where: { id: params.id } });
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (session!.user.role === "SITE_MANAGER") {
      if (request.requestedById !== session!.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (request.status !== "PENDING") return NextResponse.json({ error: "Cannot delete a reviewed request." }, { status: 400 });
    }

    await prisma.request.delete({ where: { id: params.id } });
    await createAuditLog({ userId: session!.user.id, action: "DELETE", resource: "Request", resourceId: params.id });
    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
