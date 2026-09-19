export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";

// Accountant can update item prices/quantities in a request (cross-examine)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN", "ACCOUNTANT");

    const { items } = await req.json();
    // items: [{ id: string, unitPrice: number, quantity: number, description: string }]

    if (!items?.length) return NextResponse.json({ error: "No items provided" }, { status: 400 });

    const request = await prisma.request.findUnique({ where: { id: params.id } });
    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    // Update each item
    const updated = await Promise.all(
      items.map(async (item: any) => {
        const totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
        return prisma.requestItem.update({
          where: { id: item.id },
          data: {
            ...(item.unitPrice !== undefined && { unitPrice: item.unitPrice }),
            ...(item.quantity !== undefined && { quantity: item.quantity }),
            ...(item.description !== undefined && { description: item.description }),
            totalPrice,
          },
        });
      })
    );

    // Recalculate total
    const allItems = await prisma.requestItem.findMany({ where: { requestId: params.id } });
    const newTotal = allItems.reduce((s, i) => s + i.totalPrice, 0);
    await prisma.request.update({ where: { id: params.id }, data: { totalAmount: newTotal } });

    await createAuditLog({
      userId: session!.user.id, action: "UPDATE", resource: "Request",
      resourceId: params.id, details: { action: "edited_items", itemCount: items.length },
    });

    return NextResponse.json({ success: true, updatedItems: updated, newTotal });
  } catch (err) { return handleApiError(err); }
}
