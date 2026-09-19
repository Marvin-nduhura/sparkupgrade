export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { getPeriodDates } from "@/lib/dates";
import { getAssignedProjectIds } from "@/lib/access";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || "";
    const reportDate = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const { start, end } = getPeriodDates("day", reportDate);

    // For site managers, scope to assigned projects
    let projectIds: string[] = [];
    if (session.user.role === "SITE_MANAGER") {
      const ids = await getAssignedProjectIds(session.user.id);
      projectIds = projectId && ids.includes(projectId) ? [projectId] : ids;
    } else {
      if (projectId) {
        projectIds = [projectId];
      } else {
        const projs = await prisma.project.findMany({ select: { id: true } });
        projectIds = projs.map((p) => p.id);
      }
    }

    if (projectIds.length === 0) {
      return NextResponse.json({
        date: reportDate,
        projects: [],
        summary: { totalReceived: 0, totalSpent: 0, totalUsage: 0 },
      });
    }

    const dateWhere = { gte: start, lte: end };

    const projectReports = await Promise.all(
      projectIds.map(async (pid) => {
        const project = await prisma.project.findUnique({
          where: { id: pid },
          select: { id: true, name: true, location: true, status: true },
        });
        if (!project) return null;

        const [received, purchases, utilities, charges, otherExpenses, usageRecords] = await Promise.all([
          prisma.moneyReceived.findMany({
            where: { projectId: pid, receivedDate: dateWhere },
            include: { receivedBy: { select: { name: true } } },
            orderBy: { receivedDate: "desc" },
          }),
          prisma.purchase.findMany({
            where: { projectId: pid, purchaseDate: dateWhere },
            include: {
              purchasedBy: { select: { name: true } },
              items: { include: { item: { select: { name: true, unit: true } } } },
              receipt: { select: { fileUrl: true, fileName: true } },
            },
            orderBy: { purchaseDate: "desc" },
          }),
          prisma.utility.findMany({
            where: { projectId: pid, usageDate: dateWhere },
            include: { receipt: { select: { fileUrl: true, fileName: true } } },
          }),
          prisma.siteCharge.findMany({
            where: { projectId: pid, chargeDate: dateWhere },
            include: { receipt: { select: { fileUrl: true, fileName: true } } },
          }),
          prisma.otherExpense.findMany({
            where: { projectId: pid, expenseDate: dateWhere },
            include: { receipt: { select: { fileUrl: true, fileName: true } } },
          }),
          prisma.inventoryUsage.findMany({
            where: { projectId: pid, usedDate: dateWhere },
            include: {
              item: { select: { name: true, unit: true } },
              recordedBy: { select: { name: true } },
            },
            orderBy: { usedDate: "desc" },
          }),
        ]);

        const totalReceived = received.reduce((s, r) => s + r.amount, 0);
        const totalSpent =
          purchases.reduce((s, p) => s + p.totalAmount, 0) +
          utilities.reduce((s, u) => s + u.amount, 0) +
          charges.reduce((s, c) => s + c.amount, 0) +
          otherExpenses.reduce((s, o) => s + o.amount, 0);

        return {
          project,
          received,
          purchases,
          utilities,
          charges,
          otherExpenses,
          usageRecords,
          totals: {
            received: totalReceived,
            spent: totalSpent,
            purchases: purchases.reduce((s, p) => s + p.totalAmount, 0),
            utilities: utilities.reduce((s, u) => s + u.amount, 0),
            charges: charges.reduce((s, c) => s + c.amount, 0),
            other: otherExpenses.reduce((s, o) => s + o.amount, 0),
            usageItems: usageRecords.filter(u => u.type === "USE").length,
            restockItems: usageRecords.filter(u => u.type === "RESTOCK").length,
          },
        };
      })
    );

    const validReports = projectReports.filter(Boolean) as any[];
    const summary = {
      totalReceived: validReports.reduce((s, r) => s + r.totals.received, 0),
      totalSpent: validReports.reduce((s, r) => s + r.totals.spent, 0),
      totalUsage: validReports.reduce((s, r) => s + r.totals.usageItems, 0),
    };

    return NextResponse.json({ date: reportDate, projects: validReports, summary });
  } catch (err) {
    return handleApiError(err);
  }
}
