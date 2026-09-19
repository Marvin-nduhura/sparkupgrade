export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || "";

    // Global top used items (by purchase count)
    const items = await prisma.inventoryItem.findMany({
      orderBy: { purchaseItems: { _count: "desc" } },
      take: 8,
      select: {
        id: true, name: true, unit: true, unitPrice: true, category: true,
        currentQuantity: true, minimumQuantity: true,
        _count: { select: { purchaseItems: true, usageRecords: true } },
      },
    });

    const max = items[0]?._count?.purchaseItems || 1;

    // Per-project top items
    const projects = await prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      where: session.user.role === "SITE_MANAGER"
        ? { assignments: { some: { userId: session.user.id, isActive: true } } }
        : undefined,
    });

    // For each project get top items by usage records
    const perProjectItems = await Promise.all(
      projects.map(async (proj) => {
        // Usage-based top items for this project
        const usageAgg = await prisma.inventoryUsage.groupBy({
          by: ["itemId"],
          where: { projectId: proj.id, type: "USE" },
          _sum: { quantity: true },
          _count: { id: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 5,
        });

        const itemDetails = await Promise.all(
          usageAgg.map(async (u) => {
            const item = await prisma.inventoryItem.findUnique({
              where: { id: u.itemId },
              select: { id: true, name: true, unit: true, category: true, unitPrice: true },
            });
            return {
              ...item,
              totalQtyUsed: u._sum.quantity || 0,
              usageCount: u._count.id,
            };
          })
        );

        // Purchase-based top items for this project
        const purchaseAgg = await prisma.purchaseItem.groupBy({
          by: ["itemId"],
          where: { purchase: { projectId: proj.id } },
          _sum: { quantity: true, totalPrice: true },
          _count: { id: true },
          orderBy: { _sum: { totalPrice: "desc" } },
          take: 5,
        });

        const purchaseItemDetails = await Promise.all(
          purchaseAgg.map(async (p) => {
            const item = await prisma.inventoryItem.findUnique({
              where: { id: p.itemId },
              select: { id: true, name: true, unit: true, category: true, unitPrice: true },
            });
            return {
              ...item,
              totalQtyPurchased: p._sum.quantity || 0,
              totalSpent: p._sum.totalPrice || 0,
              purchaseCount: p._count.id,
            };
          })
        );

        return {
          projectId: proj.id,
          projectName: proj.name,
          topByUsage: itemDetails.filter(Boolean),
          topByPurchase: purchaseItemDetails.filter(Boolean),
        };
      })
    );

    return NextResponse.json({ items, max, perProject: perProjectItems });
  } catch (err) { return handleApiError(err); }
}
