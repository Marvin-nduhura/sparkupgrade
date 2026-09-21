export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/reset-data
 * Admin-only. Deletes all transaction data, keeps user accounts.
 * Requires header: x-reset-confirm: RESET-ALL-DATA
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SYSTEM_ADMIN") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    // Extra safety header
    const confirm = req.headers.get("x-reset-confirm");
    if (confirm !== "RESET-ALL-DATA") {
      return NextResponse.json({ error: "Missing confirmation header" }, { status: 400 });
    }

    const results: Record<string, number | string> = {};

    const del = async (label: string, fn: () => Promise<{ count: number }>) => {
      try {
        const r = await fn();
        results[label] = r.count;
      } catch (e: any) {
        results[label] = `skipped (${e.code || e.message?.slice(0, 40)})`;
      }
    };

    await del("auditLogs",           () => prisma.auditLog.deleteMany());
    await del("userNotifications",   () => prisma.userNotification.deleteMany());
    await del("notifications",       () => prisma.notification.deleteMany());
    await del("inventoryUsage",      () => prisma.inventoryUsage.deleteMany());
    await del("dailyReports",        () => prisma.dailyReport.deleteMany());
    await del("projectImages",       () => prisma.projectImage.deleteMany());
    await del("purchaseItems",       () => prisma.purchaseItem.deleteMany());
    await del("installments",        () => prisma.installment.deleteMany());
    await del("purchases",           () => prisma.purchase.deleteMany());
    await del("requestItems",        () => prisma.requestItem.deleteMany());
    await del("requests",            () => prisma.request.deleteMany());
    await del("moneyReceived",       () => prisma.moneyReceived.deleteMany());
    await del("moneyTransfers",      () => prisma.moneyTransfer.deleteMany());
    await del("utilities",           () => prisma.utility.deleteMany());
    await del("siteCharges",         () => prisma.siteCharge.deleteMany());
    await del("otherExpenses",       () => prisma.otherExpense.deleteMany());
    await del("officeExpenses",      () => prisma.officeExpense.deleteMany());
    await del("officeIncome",        () => (prisma as any).officeIncome.deleteMany());
    await del("projectInventory",    () => prisma.projectInventory.deleteMany());
    await del("inventoryItems",      () => prisma.inventoryItem.deleteMany());
    await del("projectAssignments",  () => prisma.projectAssignment.deleteMany());
    await del("projects",            () => prisma.project.deleteMany());
    await del("receipts",            () => prisma.receipt.deleteMany());
    await del("sessions",            () => prisma.session.deleteMany());

    const users = await prisma.user.findMany({
      select: { name: true, email: true, role: true },
    });

    return NextResponse.json({
      success: true,
      message: "All data cleared. User accounts preserved.",
      deleted: results,
      usersKept: users.map(u => ({ name: u.name, email: u.email, role: u.role })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Reset failed" }, { status: 500 });
  }
}
