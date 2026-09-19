export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { deleteUploadedFile } from "@/lib/upload";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Only admins and accountants can delete receipts
    if (!["SYSTEM_ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const receipt = await prisma.receipt.findUnique({ where: { id: params.id } });
    if (!receipt) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    // Delete the physical file
    await deleteUploadedFile(receipt.fileUrl).catch(() => {});

    // Unlink from related records before deleting
    await Promise.all([
      prisma.purchase.updateMany({ where: { receiptId: params.id }, data: { receiptId: null } }),
      prisma.installment.updateMany({ where: { receiptId: params.id }, data: { receiptId: null } }),
      prisma.utility.updateMany({ where: { receiptId: params.id }, data: { receiptId: null } }),
      prisma.siteCharge.updateMany({ where: { receiptId: params.id }, data: { receiptId: null } }),
      prisma.otherExpense.updateMany({ where: { receiptId: params.id }, data: { receiptId: null } }),
      prisma.officeExpense.updateMany({ where: { receiptId: params.id }, data: { receiptId: null } }),
    ]);

    await prisma.receipt.delete({ where: { id: params.id } });
    await createAuditLog({
      userId: session.user.id, action: "DELETE",
      resource: "Receipt", resourceId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
