export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireAuth } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { assertEditWindow } from "@/lib/access";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireAuth(session);
    const record = await prisma.moneyReceived.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await assertEditWindow(session, record.createdAt);

    const body = await req.json();
    const updated = await prisma.moneyReceived.update({
      where: { id: params.id },
      data: {
        ...(body.amount !== undefined && { amount: Number(body.amount) }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
        ...(body.receivedDate && { receivedDate: new Date(body.receivedDate) }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.reference !== undefined && { reference: body.reference }),
      },
    });
    await createAuditLog({
      userId: session!.user.id,
      projectId: record.projectId,
      action: "UPDATE",
      resource: "MoneyReceived",
      resourceId: params.id,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireAuth(session);
    const record = await prisma.moneyReceived.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await assertEditWindow(session, record.createdAt);
    await prisma.moneyReceived.delete({ where: { id: params.id } });
    await createAuditLog({
      userId: session!.user.id,
      projectId: record.projectId,
      action: "DELETE",
      resource: "MoneyReceived",
      resourceId: params.id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
