/**
 * Shared receipt upload + AI verification helper.
 * Used by purchases, installments, utilities, charges, other expenses, office expenses.
 */
import { prisma } from "@/lib/prisma";
import { verifyReceipt, type AIReceiptVerification } from "@/lib/gemini";
import { saveUploadedFile } from "@/lib/upload";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

export interface ReceiptContext {
  projectId?: string;
  recordedById?: string;
  /** Human-readable name of what the expense is for */
  expenseName: string;
  expenseAmount: number;
  /** e.g. "utility", "charge", "other", "office", "purchase", "installment" */
  expenseType: string;
  /** For purchases: list of items to verify against. For single expenses: one item. */
  items?: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  projectName?: string;
  purchasedBy?: string;
}

export interface SavedReceipt {
  receiptId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  aiVerification: AIReceiptVerification | null;
}

/**
 * Save a receipt file, run AI verification if it's an image, and persist the Receipt record.
 */
export async function saveReceiptWithAI(
  file: File,
  ctx: ReceiptContext
): Promise<SavedReceipt> {
  // Save the file
  const fileUrl = await saveUploadedFile(file, "receipts");
  const fileName = file.name;
  const fileType = file.type;

  let aiVerification: AIReceiptVerification | null = null;

  // Only run AI on images (Gemini vision only works with images)
  if (file.type.startsWith("image/")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Build item list — single-item expenses become a 1-item array
    const items = ctx.items ?? [
      {
        name: ctx.expenseName,
        quantity: 1,
        unitPrice: ctx.expenseAmount,
        totalPrice: ctx.expenseAmount,
      },
    ];

    aiVerification = await verifyReceipt(base64, file.type, items, {
      projectName: ctx.projectName,
      purchasedBy: ctx.purchasedBy,
      projectId: ctx.projectId,
      recordedById: ctx.recordedById,
    }).catch(() => null);
  }

  // Persist receipt record
  const receipt = await prisma.receipt.create({
    data: {
      fileUrl,
      fileName,
      fileType,
      aiVerified: aiVerification?.verified ?? false,
      aiResult: aiVerification ? JSON.stringify(aiVerification) : null,
      projectId: ctx.projectId ?? null,
    },
  });

  return {
    receiptId: receipt.id,
    fileUrl,
    fileName,
    fileType,
    aiVerification,
  };
}
