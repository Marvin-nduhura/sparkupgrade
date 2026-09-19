export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireAuth } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { assertEditWindow } from "@/lib/access";

async function loadExpense(id: string) {
  const utility = await prisma.utility.findUnique({ where: { id } });
  if (utility) return { type: "utility" as const, record: utility };
  const charge = await prisma.siteCharge.findUnique({ where: { id } });
  if (charge) return { type: "charge" as const, record: charge };
  const other = await prisma.otherExpense.findUnique({ where: { id } });
  if (other) return { type: "other" as const, record: other };
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireAuth(session);
    const found = await loadExpense(params.id);
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await assertEditWindow(session, found.record.createdAt);

    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.amount !== undefined) data.amount = Number(body.amount);
    if (body.category !== undefined) data.category = body.category;
    if (body.description !== undefined) data.description = body.description;
    if (body.paymentMethod) data.paymentMethod = body.paymentMethod;

    let updated;
    if (found.type === "utility") {
      if (body.date) data.usageDate = new Date(body.date);
      updated = await prisma.utility.update({ where: { id: params.id }, data });
    } else if (found.type === "charge") {
      if (body.date) data.chargeDate = new Date(body.date);
      updated = await prisma.siteCharge.update({ where: { id: params.id }, data });
    } else {
      if (body.date) data.expenseDate = new Date(body.date);
      updated = await prisma.otherExpense.update({ where: { id: params.id }, data });
    }

    await createAuditLog({
      userId: session!.user.id,
      projectId: found.record.projectId,
      action: "UPDATE",
      resource: found.type,
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
    const found = await loadExpense(params.id);
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await assertEditWindow(session, found.record.createdAt);

    if (found.type === "utility") await prisma.utility.delete({ where: { id: params.id } });
    else if (found.type === "charge") await prisma.siteCharge.delete({ where: { id: params.id } });
    else await prisma.otherExpense.delete({ where: { id: params.id } });

    await createAuditLog({
      userId: session!.user.id,
      projectId: found.record.projectId,
      action: "DELETE",
      resource: found.type,
      resourceId: params.id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
