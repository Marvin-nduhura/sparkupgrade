export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";
import { endOfDay, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN", "ACCOUNTANT");

    const url = new URL(req.url);
    const asOfStr = url.searchParams.get("asOf") || new Date().toISOString().split("T")[0];
    const asOf = endOfDay(parseISO(asOfStr));
    const dateBefore = { lte: asOf };

    const [
      totalReceived,
      purchasesTotal,
      purchasesDue,
      utilitiesTotal,
      chargesTotal,
      otherExpTotal,
      officeExpTotal,
      officeIncomeAgg,
      projectsData,
    ] = await Promise.all([
      prisma.moneyReceived.aggregate({ where: { receivedDate: dateBefore }, _sum: { amount: true } }),
      prisma.purchase.aggregate({ where: { purchaseDate: dateBefore }, _sum: { totalAmount: true, amountPaid: true, amountDue: true } }),
      prisma.purchase.aggregate({ where: { purchaseDate: dateBefore, paymentStatus: "PARTIAL" }, _sum: { amountDue: true } }),
      prisma.utility.aggregate({ where: { usageDate: dateBefore }, _sum: { amount: true } }),
      prisma.siteCharge.aggregate({ where: { chargeDate: dateBefore }, _sum: { amount: true } }),
      prisma.otherExpense.aggregate({ where: { expenseDate: dateBefore }, _sum: { amount: true } }),
      prisma.officeExpense.aggregate({ where: { expenseDate: dateBefore }, _sum: { amount: true } }),
      prisma.officeIncome.aggregate({ where: { receivedDate: dateBefore }, _sum: { amount: true } }),
      prisma.project.findMany({ select: { id: true, name: true, status: true, location: true }, orderBy: { name: "asc" } }),
    ]);

    const projectIncomeTotal = totalReceived._sum.amount || 0;
    const officeIncomeTotal = officeIncomeAgg._sum.amount || 0;
    const totalIncome = projectIncomeTotal + officeIncomeTotal;
    const purchaseAmount = purchasesTotal._sum.totalAmount || 0;
    const utilitiesAmount = utilitiesTotal._sum.amount || 0;
    const chargesAmount = chargesTotal._sum.amount || 0;
    const otherAmount = otherExpTotal._sum.amount || 0;
    const officeAmount = officeExpTotal._sum.amount || 0;
    const totalExpenditure = purchaseAmount + utilitiesAmount + chargesAmount + otherAmount + officeAmount;
    const netPosition = totalIncome - totalExpenditure;
    const outstandingPayables = purchasesDue._sum.amountDue || 0;

    // Per-project breakdown
    const projectBreakdowns = await Promise.all(
      projectsData.map(async (proj) => {
        const [recv, purch, util, charge, other] = await Promise.all([
          prisma.moneyReceived.aggregate({ where: { projectId: proj.id, receivedDate: dateBefore }, _sum: { amount: true } }),
          prisma.purchase.aggregate({ where: { projectId: proj.id, purchaseDate: dateBefore }, _sum: { totalAmount: true, amountPaid: true, amountDue: true }, _count: true }),
          prisma.utility.aggregate({ where: { projectId: proj.id, usageDate: dateBefore }, _sum: { amount: true } }),
          prisma.siteCharge.aggregate({ where: { projectId: proj.id, chargeDate: dateBefore }, _sum: { amount: true } }),
          prisma.otherExpense.aggregate({ where: { projectId: proj.id, expenseDate: dateBefore }, _sum: { amount: true } }),
        ]);

        const received = recv._sum.amount || 0;
        const purchases = purch._sum.totalAmount || 0;
        const utilities = util._sum.amount || 0;
        const charges = charge._sum.amount || 0;
        const otherExp = other._sum.amount || 0;
        const spent = purchases + utilities + charges + otherExp;
        const balance = received - spent;

        return {
          id: proj.id,
          name: proj.name,
          status: proj.status,
          location: proj.location,
          received,
          purchases,
          utilities,
          charges,
          otherExp,
          spent,
          balance,
          amountDue: purch._sum.amountDue || 0,
          purchaseCount: purch._count,
        };
      })
    );

    const income = [
      { label: "Funds Received from Projects", amount: projectIncomeTotal },
      { label: "Office Income (Admin/Non-project)", amount: officeIncomeTotal },
      { label: "TOTAL INCOME", amount: totalIncome, isTotal: true },
    ].filter(r => r.amount > 0 || r.isTotal);

    const expenditure = [
      { label: "Materials & Purchases", amount: purchaseAmount },
      { label: "Utilities", amount: utilitiesAmount },
      { label: "Site Charges", amount: chargesAmount },
      { label: "Other Site Expenses", amount: otherAmount },
      { label: "Office Expenses", amount: officeAmount },
      { label: "TOTAL EXPENDITURE", amount: totalExpenditure, isTotal: true },
      { label: "Outstanding Payables (unpaid balances)", amount: outstandingPayables, isSubtotal: true },
    ].filter(r => r.amount > 0);

    return NextResponse.json({
      balanceSheet: {
        income, expenditure, netPosition, outstandingPayables,
        asOf, projectCount: projectsData.length, projectBreakdowns,
      },
    });
  } catch (err) { return handleApiError(err); }
}
