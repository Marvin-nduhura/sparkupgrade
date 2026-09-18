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
      purchasesTotal, purchasesPaid, purchasesDue,
      utilitiesTotal, chargesTotal, otherExpTotal, officeExpTotal,
      projectsData,
    ] = await Promise.all([
      prisma.moneyReceived.aggregate({ where: { receivedDate: dateBefore }, _sum: { amount: true } }),
      prisma.purchase.aggregate({ where: { purchaseDate: dateBefore }, _sum: { totalAmount: true, amountPaid: true, amountDue: true } }),
      prisma.installment.aggregate({ where: { paymentDate: dateBefore }, _sum: { amount: true } }),
      prisma.purchase.aggregate({ where: { purchaseDate: dateBefore, paymentStatus: "PARTIAL" }, _sum: { amountDue: true } }),
      prisma.utility.aggregate({ where: { usageDate: dateBefore }, _sum: { amount: true } }),
      prisma.siteCharge.aggregate({ where: { chargeDate: dateBefore }, _sum: { amount: true } }),
      prisma.otherExpense.aggregate({ where: { expenseDate: dateBefore }, _sum: { amount: true } }),
      prisma.officeExpense.aggregate({ where: { expenseDate: dateBefore }, _sum: { amount: true } }),
      prisma.project.findMany({
        select: { id: true, name: true, status: true },
        where: { createdAt: dateBefore },
      }),
    ]);

    const totalIncome = totalReceived._sum.amount || 0;
    const purchaseAmount = purchasesTotal._sum.totalAmount || 0;
    const utilitiesAmount = utilitiesTotal._sum.amount || 0;
    const chargesAmount = chargesTotal._sum.amount || 0;
    const otherAmount = otherExpTotal._sum.amount || 0;
    const officeAmount = officeExpTotal._sum.amount || 0;
    const totalExpenditure = purchaseAmount + utilitiesAmount + chargesAmount + otherAmount + officeAmount;
    const netPosition = totalIncome - totalExpenditure;
    const outstandingPayables = purchasesDue._sum.amountDue || 0;

    const income = [
      { label: "Funds Received from Projects", amount: totalIncome, isSubtotal: false },
      { label: "TOTAL INCOME", amount: totalIncome, isTotal: true },
    ];

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
      balanceSheet: { income, expenditure, netPosition, outstandingPayables, asOf, projectCount: projectsData.length },
    });
  } catch (err) { return handleApiError(err); }
}
