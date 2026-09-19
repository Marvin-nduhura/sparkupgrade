import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

async function getGeminiClient() {
  let apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    try {
      const settings = await prisma.companySettings.findFirst({ select: { geminiKey: true } });
      apiKey = settings?.geminiKey || "";
    } catch {
      apiKey = "";
    }
  }
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

export interface AIReceiptVerification {
  verified: boolean;
  confidence: number;
  message: string;
  itemsFound: string[];
  pricesFound: number[];
  totalFound: number | null;
  mismatches: Array<{
    item: string;
    issue: string;
    claimedQty?: number;
    claimedUnitPrice?: number;
    claimedTotal?: number;
    foundQty?: number | null;
    foundUnitPrice?: number | null;
    foundTotal?: number | null;
  }>;
  suggestions: string[];
}

/**
 * Deeply verify a receipt against claimed purchase items.
 * Sends a notification to admins/accountants when items don't match.
 */
export async function verifyReceipt(
  imageBase64: string,
  mimeType: string,
  claimedItems: { name: string; quantity: number; unitPrice: number; totalPrice: number }[],
  context?: {
    projectName?: string;
    purchasedBy?: string;
    purchaseDate?: string;
    purchaseId?: string;
    projectId?: string;
    recordedById?: string;
  }
): Promise<AIReceiptVerification> {
  const fallback = (message: string): AIReceiptVerification => ({
    verified: false, confidence: 0, message,
    itemsFound: [], pricesFound: [], totalFound: null,
    mismatches: [], suggestions: ["Manual verification required"],
  });

  try {
    const genAI = await getGeminiClient();
    if (!genAI) return fallback("AI verification unavailable — no Gemini API key configured.");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const itemsList = claimedItems
      .map((i, idx) => `${idx + 1}. "${i.name}" — qty: ${i.quantity}, unit price: ${i.unitPrice.toLocaleString()} UGX, total: ${i.totalPrice.toLocaleString()} UGX`)
      .join("\n");

    const claimedGrandTotal = claimedItems.reduce((s, i) => s + i.totalPrice, 0);

    const prompt = `You are a strict financial auditor for Spark Construction Limited in Uganda.

A receipt has been uploaded for a purchase. Your job is to CAREFULLY read the entire receipt and verify it against the claimed items.

CLAIMED PURCHASE ITEMS:
${itemsList}
CLAIMED GRAND TOTAL: ${claimedGrandTotal.toLocaleString()} UGX
${context?.projectName ? `PROJECT: ${context.projectName}` : ""}
${context?.purchasedBy ? `PURCHASED BY: ${context.purchasedBy}` : ""}
${context?.purchaseDate ? `DATE: ${context.purchaseDate}` : ""}

YOUR TASK:
1. Read every item, price, quantity, and total on the receipt
2. For each claimed item, check if it appears on the receipt with matching name, quantity, unit price, and total
3. Flag any item that is NOT found on the receipt or has wrong price/quantity
4. Compare the grand total

Respond ONLY with a valid JSON object (no markdown, no explanation outside JSON):
{
  "verified": boolean,
  "confidence": number (0-100),
  "message": "brief overall verdict",
  "itemsFound": ["item names seen on receipt"],
  "pricesFound": [prices seen on receipt as numbers],
  "totalFound": number or null,
  "mismatches": [
    {
      "item": "item name",
      "issue": "NOT_FOUND | WRONG_QTY | WRONG_PRICE | WRONG_TOTAL | PARTIAL_MATCH",
      "claimedQty": number,
      "claimedUnitPrice": number,
      "claimedTotal": number,
      "foundQty": number or null,
      "foundUnitPrice": number or null,
      "foundTotal": number or null
    }
  ],
  "suggestions": ["actionable observations"]
}`;

    let result: AIReceiptVerification;
    try {
      const response = await model.generateContent([
        { inlineData: { mimeType, data: imageBase64 } },
        prompt,
      ]);
      const text = response.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : fallback("Could not parse AI response");
    } catch {
      return fallback("AI verification failed — please verify manually.");
    }

    // If there are mismatches or it's unverified, notify admins & accountants
    if (!result.verified || result.mismatches?.length > 0) {
      await notifyReceiptMismatch(result, claimedItems, context).catch(() => {});
    }

    return result;
  } catch {
    return fallback("AI verification failed — please verify manually.");
  }
}

async function notifyReceiptMismatch(
  result: AIReceiptVerification,
  claimedItems: { name: string; quantity: number; unitPrice: number; totalPrice: number }[],
  context?: {
    projectName?: string;
    purchasedBy?: string;
    purchaseDate?: string;
    purchaseId?: string;
    projectId?: string;
    recordedById?: string;
  }
) {
  try {
    const [admins, accountants] = await Promise.all([
      prisma.user.findMany({ where: { role: "SYSTEM_ADMIN", isActive: true }, select: { id: true } }),
      prisma.user.findMany({ where: { role: "ACCOUNTANT", isActive: true }, select: { id: true } }),
    ]);

    const senderId = admins[0]?.id || accountants[0]?.id;
    if (!senderId) return;

    const mismatchDetails = result.mismatches?.length
      ? result.mismatches.map(m =>
          `• "${m.item}": ${m.issue.replace(/_/g, " ")}` +
          (m.issue === "NOT_FOUND" ? " (not on receipt)" : "") +
          (m.issue === "WRONG_PRICE" ? ` (claimed: UGX ${m.claimedUnitPrice?.toLocaleString()}, found: UGX ${m.foundUnitPrice?.toLocaleString() ?? "?"})` : "") +
          (m.issue === "WRONG_QTY" ? ` (claimed: ${m.claimedQty}, found: ${m.foundQty ?? "?"})` : "")
        ).join("\n")
      : "Items not found or totals don't match";

    const title = "⚠️ Receipt Mismatch Detected";
    const message = [
      `A receipt uploaded by ${context?.purchasedBy || "a user"} for ${context?.projectName || "a project"} did not fully match the purchase records.`,
      ``,
      `ITEMS CLAIMED:`,
      ...claimedItems.map(i => `• ${i.name}: ${i.quantity} × UGX ${i.unitPrice.toLocaleString()} = UGX ${i.totalPrice.toLocaleString()}`),
      ``,
      `AI FINDINGS (confidence: ${result.confidence}%):`,
      mismatchDetails,
      ``,
      `AI Message: ${result.message}`,
      result.suggestions?.length ? `Suggestions: ${result.suggestions.join("; ")}` : "",
    ].filter(Boolean).join("\n");

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        priority: "URGENT",
        sentById: senderId,
        projectId: context?.projectId || undefined,
      },
    });

    const recipients = [...admins, ...accountants]
      .map(u => u.id)
      .filter((id, i, arr) => arr.indexOf(id) === i);

    if (recipients.length) {
      await prisma.userNotification.createMany({
        data: recipients.map(userId => ({ userId, notificationId: notification.id })),
        skipDuplicates: true,
      });
    }
  } catch (err) {
    console.error("Receipt mismatch notification failed:", err);
  }
}

export async function analyzeProjectImage(
  imageBase64: string,
  mimeType: string,
  projectName: string
): Promise<string> {
  try {
    const genAI = await getGeminiClient();
    if (!genAI) return "Image analysis unavailable.";
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      { inlineData: { mimeType, data: imageBase64 } },
      `Analyze this construction site progress image for the project "${projectName}" in Uganda. 
       Provide a brief, professional construction progress assessment in 2-3 sentences.
       Focus on: visible construction stage, apparent quality, and any notable observations.`,
    ]);
    return result.response.text();
  } catch {
    return "Image analysis unavailable.";
  }
}

export async function getFinancialAdvice(data: {
  totalBudget: number;
  totalSpent: number;
  totalReceived: number;
  itemsCount: number;
  pendingPayments: number;
}): Promise<string> {
  try {
    const genAI = await getGeminiClient();
    if (!genAI) return "Financial analysis unavailable. Configure Gemini AI in company settings.";
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(
      `As a financial advisor for Spark Construction Limited Uganda, analyze:
      - Budget: ${data.totalBudget.toLocaleString()} UGX
      - Spent: ${data.totalSpent.toLocaleString()} UGX
      - Received: ${data.totalReceived.toLocaleString()} UGX
      - Items Purchased: ${data.itemsCount}
      - Pending Payments: ${data.pendingPayments.toLocaleString()} UGX
      Provide 2-3 concise actionable financial insights.`
    );
    return result.response.text();
  } catch {
    return "Financial analysis unavailable.";
  }
}
