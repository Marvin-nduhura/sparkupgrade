export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { scopedProjectIds } from "@/lib/access";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ids = await scopedProjectIds(session);
    const months = 6;
    const data = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const receivedWhere: any = { receivedDate: { gte: start, lte: end } };
      const spentWhere: any = { purchaseDate: { gte: start, lte: end } };
      if (ids) {
        receivedWhere.projectId = { in: ids };
        spentWhere.projectId = { in: ids };
      }

      const [received, spent] = await Promise.all([
        prisma.moneyReceived.aggregate({
          where: receivedWhere,
          _sum: { amount: true },
        }),
        prisma.purchase.aggregate({
          where: spentWhere,
          _sum: { totalAmount: true },
        }),
      ]);

      data.push({
        month: format(date, "MMM"),
        received: received._sum.amount || 0,
        spent: spent._sum.totalAmount || 0,
      });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
