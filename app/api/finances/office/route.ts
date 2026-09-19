export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { saveReceiptWithAI } from "@/lib/receipt";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN", "ACCOUNTANT");

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [expenses, total, totalAgg] = await Promise.all([
      prisma.officeExpense.findMany({
        skip, take: limit, orderBy: { expenseDate: "desc" },
        include: {
          user: { select: { name: true } },
          receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true, aiResult: true } },
        },
      }),
      prisma.officeExpense.count(),
      prisma.officeExpense.aggregate({ _sum: { amount: true } }),
    ]);

    return NextResponse.json({
      expenses,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      totalAmount: totalAgg._sum.amount || 0,
    });
  } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN", "ACCOUNTANT");

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const category = formData.get("category") as string || "OFFICE";
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("paymentMethod") as string || "CASH";
    const expenseDate = formData.get("expenseDate") as string;
    const description = formData.get("description") as string || "";
    const receiptFile = formData.get("receipt") as File | null;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!amount || amount <= 0) return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });

    let receiptId: string | undefined;
    let aiVerification = null;

    if (receiptFile && receiptFile.size > 0) {
      try {
        const saved = await saveReceiptWithAI(receiptFile, {
          recordedById: session!.user.id,
          expenseName: name,
          expenseAmount: amount,
          expenseType: "office",
          purchasedBy: session!.user.name,
        });
        receiptId = saved.receiptId;
        aiVerification = saved.aiVerification;
      } catch (e: any) {
        console.warn("Receipt save failed:", e.message);
      }
    }

    const expense = await prisma.officeExpense.create({
      data: {
        name, category, amount,
        paymentMethod: paymentMethod as any,
        expenseDate: new Date(expenseDate),
        description,
        userId: session!.user.id,
        receiptId,
      },
    });

    await createAuditLog({
      userId: session!.user.id, action: "CREATE",
      resource: "OfficeExpense", resourceId: expense.id,
      details: { name, amount },
    });

    return NextResponse.json({ expense, aiVerification }, { status: 201 });
  } catch (err) { return handleApiError(err); }
}
