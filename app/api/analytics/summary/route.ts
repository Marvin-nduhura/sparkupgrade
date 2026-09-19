export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { scopedProjectIds } from "@/lib/access";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ids = await scopedProjectIds(session);
    const receivedWhere: any = {};
    const purchaseWhere: any = {};
    const projectWhere: any = { status: "ACTIVE" };
    if (ids) {
      receivedWhere.projectId = { in: ids };
      purchaseWhere.projectId = { in: ids };
      projectWhere.id = { in: ids };
    }

    const [totalReceived, totalSpent, activeProjects, inventoryItems, activeUsers] = await Promise.all([
      prisma.moneyReceived.aggregate({ where: receivedWhere, _sum: { amount: true } }),
      prisma.purchase.aggregate({ where: purchaseWhere, _sum: { totalAmount: true } }),
      prisma.project.count({ where: projectWhere }),
      prisma.inventoryItem.count(),
      session.user.role === "SITE_MANAGER"
        ? Promise.resolve(0)
        : prisma.user.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      data: {
        totalReceived: totalReceived._sum.amount || 0,
        totalSpent: totalSpent._sum.totalAmount || 0,
        activeProjects,
        inventoryItems,
        activeUsers,
      },
    });
  } catch (err) { return handleApiError(err); }
}
