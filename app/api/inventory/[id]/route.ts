export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { name, description, unit, category, currentQuantity, minimumQuantity, unitPrice } = body;
    const item = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: { name, description, unit, category, currentQuantity, minimumQuantity, unitPrice },
    });
    await createAuditLog({ userId: session.user.id, action: "UPDATE", resource: "InventoryItem", resourceId: params.id });
    return NextResponse.json(item);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SYSTEM_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    await prisma.inventoryItem.delete({ where: { id: params.id } });
    await createAuditLog({ userId: session.user.id, action: "DELETE", resource: "InventoryItem", resourceId: params.id });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
