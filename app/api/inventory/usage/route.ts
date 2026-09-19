export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { getAssignedProjectIds } from "@/lib/access";
import { maybeNotifyLowStock } from "@/lib/notify";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const itemId = url.searchParams.get("itemId") || "";
    const projectId = url.searchParams.get("projectId") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (itemId) where.itemId = itemId;
    if (projectId) where.projectId = projectId;

    if (session.user.role === "SITE_MANAGER") {
      const ids = await getAssignedProjectIds(session.user.id);
      where.projectId = projectId && ids.includes(projectId) ? projectId : { in: ids };
    }

    const [records, total] = await Promise.all([
      prisma.inventoryUsage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { usedDate: "desc" },
        include: { item: { select: { name: true, unit: true } } },
      }),
      prisma.inventoryUsage.count({ where }),
    ]);

    return NextResponse.json({ records, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role === "ACCOUNTANT") {
      return NextResponse.json({ error: "Accountants cannot record usage" }, { status: 403 });
    }

    const { itemId, projectId, quantity, description, usedDate } = await req.json();
    if (!itemId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Item and a valid quantity are required" }, { status: 400 });
    }

    if (session.user.role === "SITE_MANAGER" && projectId) {
      const ids = await getAssignedProjectIds(session.user.id);
      if (!ids.includes(projectId)) {
        return NextResponse.json({ error: "You are not assigned to this project" }, { status: 403 });
      }
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.currentQuantity < quantity) {
      return NextResponse.json(
        { error: `Not enough stock. Available: ${item.currentQuantity} ${item.unit}` },
        { status: 400 }
      );
    }

    const usage = await prisma.inventoryUsage.create({
      data: {
        itemId,
        projectId: projectId || undefined,
        quantity,
        description,
        usedDate: usedDate ? new Date(usedDate) : new Date(),
      },
    });

    const updated = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { currentQuantity: { decrement: quantity } },
    });

    if (projectId) {
      await prisma.projectInventory.updateMany({
        where: { projectId, itemId },
        data: { quantity: { decrement: quantity } },
      });
    }

    await maybeNotifyLowStock({
      name: updated.name,
      currentQuantity: updated.currentQuantity,
      minimumQuantity: updated.minimumQuantity,
      unit: updated.unit,
    });

    await createAuditLog({
      userId: session.user.id,
      projectId: projectId || undefined,
      action: "UPDATE",
      resource: "InventoryUsage",
      resourceId: usage.id,
      details: { item: item.name, quantity },
    });

    return NextResponse.json({ usage, remaining: updated.currentQuantity }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
