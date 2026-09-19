export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { getFinancialAdvice } from "@/lib/gemini";
import { getAssignedProjectIds } from "@/lib/access";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projectWhere: any = {};
    if (session.user.role === "SITE_MANAGER") {
      const ids = await getAssignedProjectIds(session.user.id);
      projectWhere.projectId = { in: ids };
    }

    const [budget, received, spent, pending, itemsCount] = await Promise.all([
      prisma.project.aggregate({
        where: session.user.role === "SITE_MANAGER"
          ? { id: { in: (projectWhere.projectId as any)?.in || [] } }
          : {},
        _sum: { budget: true },
      }),
      prisma.moneyReceived.aggregate({ where: projectWhere, _sum: { amount: true } }),
      prisma.purchase.aggregate({ where: projectWhere, _sum: { totalAmount: true } }),
      prisma.purchase.aggregate({ where: { ...projectWhere, paymentStatus: "PARTIAL" }, _sum: { amountDue: true } }),
      prisma.purchaseItem.count(),
    ]);

    const advice = await getFinancialAdvice({
      totalBudget: budget._sum.budget || 0,
      totalSpent: spent._sum.totalAmount || 0,
      totalReceived: received._sum.amount || 0,
      itemsCount,
      pendingPayments: pending._sum.amountDue || 0,
    });

    return NextResponse.json({ advice });
  } catch (err) {
    return handleApiError(err);
  }
}
