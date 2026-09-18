import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns";

function getPeriodDates(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  switch (period) {
    case "day": return { start: startOfDay(now), end: endOfDay(now) };
    case "week": return { start: startOfWeek(now), end: endOfWeek(now) };
    case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
    case "year": return { start: startOfYear(now), end: endOfYear(now) };
    case "custom":
      return {
        start: startDate ? startOfDay(parseISO(startDate)) : startOfMonth(now),
        end: endDate ? endOfDay(parseISO(endDate)) : endOfMonth(now),
      };
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || "";
    const period = url.searchParams.get("period") || "month";
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";
    const { start, end } = getPeriodDates(period, startDate, endDate);

    const projectWhere: any = {};
    if (projectId) projectWhere.id = projectId;
    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({ where: { userId: session.user.id, isActive: true }, select: { projectId: true } });
      projectWhere.id = { in: assignments.map(a => a.projectId) };
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, status: true, location: true },
    });
    const projectIds = projects.map(p => p.id);

    const dateWhere = { gte: start, lte: end };
    const [received, purchases, utilities, charges, otherExpenses, officeExpenses] = await Promise.all([
      prisma.moneyReceived.aggregate({ where: { projectId: { in: projectIds }, receivedDate: dateWhere }, _sum: { amount: true }, _count: true }),
      prisma.purchase.findMany({ where: { projectId: { in: projectIds }, purchaseDate: dateWhere }, select: { id: true, totalAmount: true, amountPaid: true, amountDue: true, projectId: true } }),
      prisma.utility.aggregate({ where: { projectId: { in: projectIds }, usageDate: dateWhere }, _sum: { amount: true } }),
      prisma.siteCharge.aggregate({ where: { projectId: { in: projectIds }, chargeDate: dateWhere }, _sum: { amount: true } }),
      prisma.otherExpense.aggregate({ where: { projectId: { in: projectIds }, expenseDate: dateWhere }, _sum: { amount: true } }),
      prisma.officeExpense.aggregate({ where: { expenseDate: dateWhere }, _sum: { amount: true } }),
    ]);

    const purchaseTotal = purchases.reduce((s, p) => s + p.totalAmount, 0);
    const totalSpent = purchaseTotal + (utilities._sum.amount || 0) + (charges._sum.amount || 0) + (otherExpenses._sum.amount || 0) + (officeExpenses._sum.amount || 0);
    const totalReceived = received._sum.amount || 0;

    // Per project breakdown
    const projectBreakdown = await Promise.all(
      projects.map(async (proj) => {
        const [recv, purch] = await Promise.all([
          prisma.moneyReceived.aggregate({ where: { projectId: proj.id, receivedDate: dateWhere }, _sum: { amount: true } }),
          prisma.purchase.aggregate({ where: { projectId: proj.id, purchaseDate: dateWhere }, _sum: { totalAmount: true }, _count: true }),
        ]);
        return { id: proj.id, name: proj.name, status: proj.status, received: recv._sum.amount || 0, spent: purch._sum.totalAmount || 0, purchaseCount: purch._count };
      })
    );

    return NextResponse.json({
      summary: { totalReceived, totalSpent, netBalance: totalReceived - totalSpent, purchaseCount: purchases.length, period: { start, end } },
      breakdown: { purchases: purchaseTotal, utilities: utilities._sum.amount || 0, charges: charges._sum.amount || 0, otherExpenses: otherExpenses._sum.amount || 0, officeExpenses: officeExpenses._sum.amount || 0 },
      projects: projectBreakdown,
    });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
