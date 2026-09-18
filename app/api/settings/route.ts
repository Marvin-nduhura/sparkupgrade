import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settings = await prisma.companySettings.findFirst();
    if (!settings) return NextResponse.json({});
    // Don't return secrets
    const { pesapalKey, pesapalSecret, geminiKey, ...safe } = settings as any;
    return NextResponse.json(safe);
  } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN");

    const body = await req.json();
    const { companyName, address, phone, email, currency, mtnNumber, airtelNumber, bankName1, bankAccount1, bankName2, bankAccount2 } = body;

    const existing = await prisma.companySettings.findFirst();
    if (existing) {
      await prisma.companySettings.update({
        where: { id: existing.id },
        data: { companyName, address, phone, email, currency, mtnNumber, airtelNumber, bankName1, bankAccount1, bankName2, bankAccount2 },
      });
    } else {
      await prisma.companySettings.create({
        data: { companyName, address, phone, email, currency, mtnNumber, airtelNumber, bankName1, bankAccount1, bankName2, bankAccount2 },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
