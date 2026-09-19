export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { saveReceiptWithAI } from "@/lib/receipt";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const purchaseId = formData.get("purchaseId") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("paymentMethod") as string;
    const paymentDate = formData.get("paymentDate") as string;
    const receiptFile = formData.get("receipt") as File | null;

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        items: { include: { item: { select: { name: true } } } },
        project: { select: { name: true } },
      },
    });
    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    if (amount > purchase.amountDue) {
      return NextResponse.json({ error: `Amount exceeds balance due: ${purchase.amountDue}` }, { status: 400 });
    }

    let receiptId: string | undefined;
    let aiVerification: any = null;

    if (receiptFile && receiptFile.size > 0) {
      try {
        const saved = await saveReceiptWithAI(receiptFile, {
          projectId: purchase.projectId,
          recordedById: session.user.id,
          expenseName: purchase.items.map(i => i.item.name).join(", "),
          expenseAmount: amount,
          expenseType: "installment",
          items: purchase.items.map(i => ({
            name: i.item.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
          projectName: purchase.project?.name,
          purchasedBy: session.user.name,
        });
        receiptId = saved.receiptId;
        aiVerification = saved.aiVerification;
      } catch (e: any) {
        console.warn("Receipt save failed:", e.message);
      }
    }

    const newAmountPaid = purchase.amountPaid + amount;
    const newAmountDue = purchase.totalAmount - newAmountPaid;
    const isFullyPaid = newAmountDue <= 0;

    const installment = await prisma.installment.create({
      data: {
        purchaseId,
        amount,
        paymentMethod: paymentMethod as any,
        paymentDate: new Date(paymentDate),
        receiptId,
        verifiedByAi: aiVerification?.verified || false,
        aiVerification: aiVerification ? JSON.stringify(aiVerification) : undefined,
      },
    });

    await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: Math.max(0, newAmountDue),
        paymentStatus: isFullyPaid ? "COMPLETED" : "PARTIAL",
      },
    });

    await createAuditLog({
      userId: session.user.id,
      projectId: purchase.projectId,
      action: "UPDATE",
      resource: "Purchase",
      resourceId: purchaseId,
      details: { action: "installment_paid", amount, newAmountPaid, isFullyPaid },
    });

    return NextResponse.json({
      installment,
      newAmountPaid,
      newAmountDue: Math.max(0, newAmountDue),
      isFullyPaid,
      aiVerification,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
