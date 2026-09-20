export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN", "ACCOUNTANT");

    const record = await prisma.officeIncome.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.officeIncome.update({
      where: { id: params.id },
      data: {
        ...(body.source !== undefined && { source: body.source }),
        ...(body.amount !== undefined && { amount: Number(body.amount) }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.reference !== undefined && { reference: body.reference }),
        ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
        ...(body.receivedDate && { receivedDate: new Date(body.receivedDate) }),
      },
    });

    await createAuditLog({ userId: session!.user.id, action: "UPDATE", resource: "OfficeIncome", resourceId: params.id });
    return NextResponse.json(updated);
  } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN", "ACCOUNTANT");

    const record = await prisma.officeIncome.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.officeIncome.delete({ where: { id: params.id } });
    await createAuditLog({ userId: session!.user.id, action: "DELETE", resource: "OfficeIncome", resourceId: params.id });
    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
