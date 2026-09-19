export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPeriodDates } from "@/lib/dates";
import { getAssignedProjectIds } from "@/lib/access";

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
      const ids = await getAssignedProjectIds(session.user.id);
      projectWhere.id = projectId && ids.includes(projectId) ? projectId : { in: ids };
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true, name: true, status: true, location: true,
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    const projectIds = projects.map((p) => p.id);
    const dateWhere = { gte: start, lte: end };
    const before = { lt: start };
    const includeOffice = session.user.role !== "SITE_MANAGER";

    const [
      received, purchases, utilities, charges, otherExpenses, officeExpenses,
      recvBefore, purchBefore, utilBefore, chargeBefore, otherBefore, officeBefore,
    ] = await Promise.all([
      prisma.moneyReceived.aggregate({ where: { projectId: { in: projectIds }, receivedDate: dateWhere }, _sum: { amount: true }, _count: true }),
      prisma.purchase.findMany({ where: { projectId: { in: projectIds }, purchaseDate: dateWhere }, select: { id: true, totalAmount: true, amountPaid: true, amountDue: true, projectId: true } }),
      prisma.utility.aggregate({ where: { projectId: { in: projectIds }, usageDate: dateWhere }, _sum: { amount: true } }),
      prisma.siteCharge.aggregate({ where: { projectId: { in: projectIds }, chargeDate: dateWhere }, _sum: { amount: true } }),
      prisma.otherExpense.aggregate({ where: { projectId: { in: projectIds }, expenseDate: dateWhere }, _sum: { amount: true } }),
      includeOffice ? prisma.officeExpense.aggregate({ where: { expenseDate: dateWhere }, _sum: { amount: true } }) : Promise.resolve({ _sum: { amount: 0 } }),
      prisma.moneyReceived.aggregate({ where: { projectId: { in: projectIds }, receivedDate: before }, _sum: { amount: true } }),
      prisma.purchase.aggregate({ where: { projectId: { in: projectIds }, purchaseDate: before }, _sum: { totalAmount: true } }),
      prisma.utility.aggregate({ where: { projectId: { in: projectIds }, usageDate: before }, _sum: { amount: true } }),
      prisma.siteCharge.aggregate({ where: { projectId: { in: projectIds }, chargeDate: before }, _sum: { amount: true } }),
      prisma.otherExpense.aggregate({ where: { projectId: { in: projectIds }, expenseDate: before }, _sum: { amount: true } }),
      includeOffice ? prisma.officeExpense.aggregate({ where: { expenseDate: before }, _sum: { amount: true } }) : Promise.resolve({ _sum: { amount: 0 } }),
    ]);

    const purchaseTotal = purchases.reduce((s, p) => s + p.totalAmount, 0);
    const amountDue = purchases.reduce((s, p) => s + p.amountDue, 0);
    const amountPaid = purchases.reduce((s, p) => s + p.amountPaid, 0);
    const periodSpent = purchaseTotal + (utilities._sum.amount || 0) + (charges._sum.amount || 0) + (otherExpenses._sum.amount || 0) + (officeExpenses._sum.amount || 0);
    const periodReceived = received._sum.amount || 0;
    const spentBefore = (purchBefore._sum.totalAmount || 0) + (utilBefore._sum.amount || 0) + (chargeBefore._sum.amount || 0) + (otherBefore._sum.amount || 0) + (officeBefore._sum.amount || 0);
    const bbf = (recvBefore._sum.amount || 0) - spentBefore;
    const closingBalance = bbf + periodReceived - periodSpent;

    const projectBreakdown = await Promise.all(
      projects.map(async (proj) => {
        const [recv, purch, util, charge, other] = await Promise.all([
          prisma.moneyReceived.aggregate({ where: { projectId: proj.id, receivedDate: dateWhere }, _sum: { amount: true } }),
          prisma.purchase.aggregate({ where: { projectId: proj.id, purchaseDate: dateWhere }, _sum: { totalAmount: true, amountDue: true, amountPaid: true }, _count: true }),
          prisma.utility.aggregate({ where: { projectId: proj.id, usageDate: dateWhere }, _sum: { amount: true } }),
          prisma.siteCharge.aggregate({ where: { projectId: proj.id, chargeDate: dateWhere }, _sum: { amount: true } }),
          prisma.otherExpense.aggregate({ where: { projectId: proj.id, expenseDate: dateWhere }, _sum: { amount: true } }),
        ]);
        const spent = (purch._sum.totalAmount || 0) + (util._sum.amount || 0) + (charge._sum.amount || 0) + (other._sum.amount || 0);
        const currentManagers = proj.assignments.filter((a) => a.isActive);
        const previousManagers = proj.assignments.filter((a) => !a.isActive);
        return {
          id: proj.id,
          name: proj.name,
          status: proj.status,
          location: proj.location,
          received: recv._sum.amount || 0,
          spent,
          amountDue: purch._sum.amountDue || 0,
          amountPaid: purch._sum.amountPaid || 0,
          purchaseCount: purch._count,
          currentManagers: currentManagers.map((a) => ({
            name: a.user.name,
            assignedAt: a.assignedAt,
            unassignedAt: a.unassignedAt,
          })),
          previousManagers: previousManagers.map((a) => ({
            name: a.user.name,
            assignedAt: a.assignedAt,
            unassignedAt: a.unassignedAt,
          })),
        };
      })
    );

    return NextResponse.json({
      summary: {
        balanceBroughtForward: bbf,
        totalReceived: periodReceived,
        totalSpent: periodSpent,
        amountDue,
        amountPaid,
        closingBalance,
        netBalance: closingBalance,
        purchaseCount: purchases.length,
        period: { start, end },
      },
      breakdown: {
        purchases: purchaseTotal,
        utilities: utilities._sum.amount || 0,
        charges: charges._sum.amount || 0,
        otherExpenses: otherExpenses._sum.amount || 0,
        officeExpenses: officeExpenses._sum.amount || 0,
      },
      projects: projectBreakdown,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
