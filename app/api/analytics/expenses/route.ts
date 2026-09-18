export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || "";

    const projectWhere: any = {};
    if (projectId) projectWhere.projectId = projectId;
    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({ where: { userId: session.user.id, isActive: true }, select: { projectId: true } });
      projectWhere.projectId = { in: assignments.map(a => a.projectId) };
    }

    const [purchasesAgg, utilitiesAgg, chargesAgg, otherAgg, officeAgg] = await Promise.all([
      prisma.purchase.aggregate({ where: projectWhere, _sum: { totalAmount: true } }),
      prisma.utility.aggregate({ where: projectWhere, _sum: { amount: true } }),
      prisma.siteCharge.aggregate({ where: projectWhere, _sum: { amount: true } }),
      prisma.otherExpense.aggregate({ where: projectWhere, _sum: { amount: true } }),
      prisma.officeExpense.aggregate({ _sum: { amount: true } }),
    ]);

    const data = [
      { category: "Materials", amount: purchasesAgg._sum.totalAmount || 0 },
      { category: "Utilities", amount: utilitiesAgg._sum.amount || 0 },
      { category: "Charges", amount: chargesAgg._sum.amount || 0 },
      { category: "Other", amount: otherAgg._sum.amount || 0 },
      { category: "Office", amount: officeAgg._sum.amount || 0 },
    ].filter(d => d.amount > 0);

    return NextResponse.json({ data });
  } catch (err) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
