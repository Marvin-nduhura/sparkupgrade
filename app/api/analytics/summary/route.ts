export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [totalReceived, totalSpent, activeProjects, inventoryItems, activeUsers] = await Promise.all([
      prisma.moneyReceived.aggregate({ _sum: { amount: true } }),
      prisma.purchase.aggregate({ _sum: { totalAmount: true } }),
      prisma.project.count({ where: { status: "ACTIVE" } }),
      prisma.inventoryItem.count(),
      prisma.user.count({ where: { isActive: true } }),
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
