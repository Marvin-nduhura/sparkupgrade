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

    const [records, total, totalAgg] = await Promise.all([
      prisma.officeIncome.findMany({
        skip, take: limit,
        orderBy: { receivedDate: "desc" },
        include: {
          recordedBy: { select: { name: true } },
          receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true } },
        },
      }),
      prisma.officeIncome.count(),
      prisma.officeIncome.aggregate({ _sum: { amount: true } }),
    ]);

    return NextResponse.json({
      records,
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
    const source = formData.get("source") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = (formData.get("paymentMethod") as string) || "CASH";
    const receivedDate = formData.get("receivedDate") as string;
    const description = (formData.get("description") as string) || "";
    const reference = (formData.get("reference") as string) || "";
    const receiptFile = formData.get("receipt") as File | null;

    if (!source) return NextResponse.json({ error: "Source is required" }, { status: 400 });
    if (!amount || amount <= 0) return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });

    let receiptId: string | undefined;
    if (receiptFile && receiptFile.size > 0) {
      try {
        const saved = await saveReceiptWithAI(receiptFile, {
          recordedById: session!.user.id,
          expenseName: `Office Income: ${source}`,
          expenseAmount: amount,
          expenseType: "office-income",
          purchasedBy: session!.user.name,
        });
        receiptId = saved.receiptId;
      } catch (e: any) { console.warn("Receipt save failed:", e.message); }
    }

    const record = await prisma.officeIncome.create({
      data: {
        source, amount,
        paymentMethod: paymentMethod as any,
        receivedDate: new Date(receivedDate),
        description, reference,
        recordedById: session!.user.id,
        receiptId,
      },
    });

    await createAuditLog({
      userId: session!.user.id, action: "CREATE",
      resource: "OfficeIncome", resourceId: record.id,
      details: { source, amount },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err) { return handleApiError(err); }
}
