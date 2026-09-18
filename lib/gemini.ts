import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface AIReceiptVerification {
  verified: boolean;
  itemsFound: string[];
  pricesFound: number[];
  totalFound: number | null;
  confidence: number;
  message: string;
  suggestions: string[];
}

// Verify receipt image against claimed items
export async function verifyReceipt(
  imageBase64: string,
  mimeType: string,
  claimedItems: { name: string; quantity: number; unitPrice: number; totalPrice: number }[]
): Promise<AIReceiptVerification> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const itemsList = claimedItems
      .map(
        (item) =>
          `- ${item.name}: qty ${item.quantity}, unit price ${item.unitPrice} UGX, total ${item.totalPrice} UGX`
      )
      .join("\n");

    const prompt = `You are a construction materials receipt verifier for Spark Construction Limited in Uganda.
    
Analyze this receipt image and verify the following claimed items and prices:
${itemsList}

Please respond with a JSON object (no markdown, just raw JSON) with:
{
  "verified": boolean (true if items and prices roughly match),
  "itemsFound": string[] (items you can see on the receipt),
  "pricesFound": number[] (prices you can see on the receipt in UGX),
  "totalFound": number | null (total amount found on receipt),
  "confidence": number (0-100, how confident you are),
  "message": string (brief explanation),
  "suggestions": string[] (any discrepancies or concerns)
}`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      prompt,
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      verified: false,
      itemsFound: [],
      pricesFound: [],
      totalFound: null,
      confidence: 0,
      message: "Could not parse AI response",
      suggestions: [],
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      verified: false,
      itemsFound: [],
      pricesFound: [],
      totalFound: null,
      confidence: 0,
      message: "AI verification failed. Please verify manually.",
      suggestions: ["Manual verification required"],
    };
  }
}

// Analyze project image for progress report
export async function analyzeProjectImage(
  imageBase64: string,
  mimeType: string,
  projectName: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      `Analyze this construction site progress image for the project "${projectName}" in Uganda. 
      Provide a brief, professional construction progress assessment in 2-3 sentences.
      Focus on: visible construction stage, apparent quality, and any notable observations.`,
    ]);

    return result.response.text();
  } catch (error) {
    console.error("Gemini image analysis error:", error);
    return "Image analysis unavailable.";
  }
}

// Get AI financial advice
export async function getFinancialAdvice(data: {
  totalBudget: number;
  totalSpent: number;
  totalReceived: number;
  itemsCount: number;
  pendingPayments: number;
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(
      `As a financial advisor for Spark Construction Limited Uganda, analyze these project finances:
      - Budget: ${data.totalBudget.toLocaleString()} UGX
      - Total Spent: ${data.totalSpent.toLocaleString()} UGX
      - Total Received: ${data.totalReceived.toLocaleString()} UGX
      - Items Purchased: ${data.itemsCount}
      - Pending Payments: ${data.pendingPayments.toLocaleString()} UGX
      
      Provide 2-3 concise, actionable financial insights for management decision-making.`
    );

    return result.response.text();
  } catch (error) {
    return "Financial analysis unavailable.";
  }
}
