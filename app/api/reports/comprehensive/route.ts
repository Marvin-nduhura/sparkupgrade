export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { getPeriodDates } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role === "SITE_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || "";
    const period = url.searchParams.get("period") || "month";
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";
    const { start, end } = getPeriodDates(period, startDate, endDate);

    const projectWhere: any = {};
    if (projectId) projectWhere.id = projectId;

    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, location: true, status: true },
      orderBy: { name: "asc" },
    });
    const ids = projects.map((p) => p.id);
    const dateWhere = { gte: start, lte: end };
    const before = { lt: start };

    const [
      received, purchases, utilities, charges, otherExpenses, officeExpenses,
      recvBefore, purchBefore, utilBefore, chargeBefore, otherBefore, officeBefore,
    ] = await Promise.all([
      prisma.moneyReceived.findMany({
        where: { projectId: { in: ids }, receivedDate: dateWhere },
        include: {
          project: { select: { name: true } },
          receivedBy: { select: { name: true } },
        },
        orderBy: { receivedDate: "desc" },
      }),
      prisma.purchase.findMany({
        where: { projectId: { in: ids }, purchaseDate: dateWhere },
        include: {
          project: { select: { name: true } },
          purchasedBy: { select: { name: true } },
          items: { include: { item: { select: { name: true, unit: true } } } },
          installments: {
            orderBy: { paymentDate: "asc" },
            include: {
              receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true } },
            },
          },
          receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true } },
        },
        orderBy: { purchaseDate: "desc" },
      }),
      prisma.utility.findMany({
        where: { projectId: { in: ids }, usageDate: dateWhere },
        include: {
          project: { select: { name: true } },
          receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true } },
        },
        orderBy: { usageDate: "desc" },
      }),
      prisma.siteCharge.findMany({
        where: { projectId: { in: ids }, chargeDate: dateWhere },
        include: {
          project: { select: { name: true } },
          receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true } },
        },
        orderBy: { chargeDate: "desc" },
      }),
      prisma.otherExpense.findMany({
        where: { projectId: { in: ids }, expenseDate: dateWhere },
        include: {
          project: { select: { name: true } },
          receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true } },
        },
        orderBy: { expenseDate: "desc" },
      }),
      prisma.officeExpense.findMany({
        where: { expenseDate: dateWhere },
        include: {
          user: { select: { name: true } },
          receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true } },
        },
        orderBy: { expenseDate: "desc" },
      }),
      prisma.moneyReceived.aggregate({ where: { projectId: { in: ids }, receivedDate: before }, _sum: { amount: true } }),
      prisma.purchase.aggregate({ where: { projectId: { in: ids }, purchaseDate: before }, _sum: { totalAmount: true } }),
      prisma.utility.aggregate({ where: { projectId: { in: ids }, usageDate: before }, _sum: { amount: true } }),
      prisma.siteCharge.aggregate({ where: { projectId: { in: ids }, chargeDate: before }, _sum: { amount: true } }),
      prisma.otherExpense.aggregate({ where: { projectId: { in: ids }, expenseDate: before }, _sum: { amount: true } }),
      prisma.officeExpense.aggregate({ where: { expenseDate: before }, _sum: { amount: true } }),
    ]);

    const totalReceived = received.reduce((s, r) => s + r.amount, 0);
    const totalPurchases = purchases.reduce((s, p) => s + p.totalAmount, 0);
    const totalUtilities = utilities.reduce((s, u) => s + u.amount, 0);
    const totalCharges = charges.reduce((s, c) => s + c.amount, 0);
    const totalOther = otherExpenses.reduce((s, o) => s + o.amount, 0);
    const totalOffice = officeExpenses.reduce((s, o) => s + o.amount, 0);
    const totalSpent = totalPurchases + totalUtilities + totalCharges + totalOther + totalOffice;
    const totalAmountDue = purchases.reduce((s, p) => s + p.amountDue, 0);
    const totalAmountPaid = purchases.reduce((s, p) => s + p.amountPaid, 0);

    const bbf =
      (recvBefore._sum.amount || 0) -
      ((purchBefore._sum.totalAmount || 0) + (utilBefore._sum.amount || 0) +
       (chargeBefore._sum.amount || 0) + (otherBefore._sum.amount || 0) + (officeBefore._sum.amount || 0));
    const closingBalance = bbf + totalReceived - totalSpent;

    const company = await prisma.companySettings.findFirst();

    return NextResponse.json({
      period: { start, end },
      company,
      summary: {
        bbf,
        totalReceived,
        totalPurchases,
        totalUtilities,
        totalCharges,
        totalOther,
        totalOffice,
        totalSpent,
        totalAmountDue,
        totalAmountPaid,
        closingBalance,
      },
      received,
      purchases,
      utilities,
      charges,
      otherExpenses,
      officeExpenses,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
