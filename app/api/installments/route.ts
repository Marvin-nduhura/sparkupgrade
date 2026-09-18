export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { verifyReceipt } from "@/lib/gemini";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

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

    // Verify purchase exists and check 24-hour rule
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: { include: { item: { select: { name: true } } } } },
    });
    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    if (amount > purchase.amountDue) return NextResponse.json({ error: `Amount exceeds balance due: ${purchase.amountDue}` }, { status: 400 });

    // Process receipt
    let receiptId: string | undefined;
    let aiVerification: any = null;

    if (receiptFile) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
      await fs.mkdir(uploadDir, { recursive: true });
      const ext = receiptFile.name.split(".").pop();
      const filename = `${uuidv4()}.${ext}`;
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, filename), buffer);

      if (receiptFile.type.startsWith("image/")) {
        aiVerification = await verifyReceipt(
          buffer.toString("base64"),
          receiptFile.type,
          purchase.items.map(i => ({ name: i.item.name, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice }))
        );
      }

      const receipt = await prisma.receipt.create({
        data: {
          fileUrl: `/uploads/receipts/${filename}`,
          fileName: receiptFile.name,
          fileType: receiptFile.type,
          aiVerified: aiVerification?.verified || false,
          aiResult: aiVerification ? JSON.stringify(aiVerification) : undefined,
          projectId: purchase.projectId,
        },
      });
      receiptId = receipt.id;
    }

    const newAmountPaid = purchase.amountPaid + amount;
    const newAmountDue = purchase.totalAmount - newAmountPaid;
    const isFullyPaid = newAmountDue <= 0;

    // Create installment
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

    // Update purchase totals
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

    return NextResponse.json({ installment, newAmountPaid, newAmountDue: Math.max(0, newAmountDue), isFullyPaid, aiVerification });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
