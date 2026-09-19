export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireAuth } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { assertEditWindow } from "@/lib/access";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireAuth(session);

    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      include: {
        project: { select: { id: true, name: true } },
        purchasedBy: { select: { name: true } },
        items: { include: { item: { select: { name: true, unit: true } } } },
        installments: {
          orderBy: { paymentDate: "desc" },
          include: { receipt: true },
        },
        receipt: true,
      },
    });

    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    // Site manager can only see their assigned projects
    if (session!.user.role === "SITE_MANAGER") {
      const assignment = await prisma.projectAssignment.findFirst({
        where: { projectId: purchase.projectId, userId: session!.user.id, isActive: true },
      });
      if (!assignment) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(purchase);
  } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireAuth(session);

    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      select: { id: true, projectId: true, purchasedById: true, createdAt: true },
    });
    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    if (session!.user.role === "SITE_MANAGER") {
      await assertEditWindow(session, purchase.createdAt);
      if (purchase.purchasedById !== session!.user.id) {
        return NextResponse.json({ error: "You can only edit your own purchases." }, { status: 403 });
      }
    }

    const body = await req.json();
    const updated = await prisma.purchase.update({
      where: { id: params.id },
      data: {
        ...(body.description !== undefined && { description: body.description }),
        ...(body.purchaseDate && { purchaseDate: new Date(body.purchaseDate) }),
      },
    });

    await createAuditLog({
      userId: session!.user.id, projectId: purchase.projectId,
      action: "UPDATE", resource: "Purchase", resourceId: params.id,
    });

    return NextResponse.json(updated);
  } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireAuth(session);

    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      select: { id: true, projectId: true, purchasedById: true, createdAt: true, items: true },
    });
    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    await assertEditWindow(session, purchase.createdAt);

    // Reverse inventory quantities
    const purchaseItems = await prisma.purchaseItem.findMany({
      where: { purchaseId: params.id },
    });
    await Promise.all(purchaseItems.map(item =>
      prisma.inventoryItem.update({
        where: { id: item.itemId },
        data: { currentQuantity: { decrement: item.quantity } },
      })
    ));

    await prisma.purchase.delete({ where: { id: params.id } });

    await createAuditLog({
      userId: session!.user.id, projectId: purchase.projectId,
      action: "DELETE", resource: "Purchase", resourceId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
