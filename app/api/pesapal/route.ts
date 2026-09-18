export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateMobileMoneyPayment, getTransactionStatus } from "@/lib/pesapal";
import { createAuditLog } from "@/lib/audit";
import { v4 as uuidv4 } from "uuid";
import { formatPhoneForApi } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SYSTEM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { toUserId, projectId, amount, description, paymentMethod } = await req.json();

    // Get recipient details
    const recipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, name: true, email: true, mtnNumber: true, airtelNumber: true },
    });

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const phone =
      paymentMethod === "MTN_MOBILE_MONEY"
        ? recipient.mtnNumber
        : recipient.airtelNumber;

    if (!phone) {
      return NextResponse.json(
        { error: `Recipient has no ${paymentMethod === "MTN_MOBILE_MONEY" ? "MTN" : "Airtel"} number registered` },
        { status: 400 }
      );
    }

    const reference = `BSPARK-${uuidv4().split("-")[0].toUpperCase()}`;
    const formattedPhone = formatPhoneForApi(phone);
    const nameParts = recipient.name.split(" ");

    // Create pending transfer
    const transfer = await prisma.moneyTransfer.create({
      data: {
        fromUserId: session.user.id,
        toUserId,
        projectId,
        amount,
        paymentMethod: paymentMethod as any,
        reference,
        description,
        status: "PENDING",
      },
    });

    // Initiate PesaPal payment (STK push)
    const pesapalResult = await initiateMobileMoneyPayment({
      amount,
      phone: formattedPhone,
      description: description || `BuildSpark Transfer - ${reference}`,
      reference,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" ") || nameParts[0],
      email: recipient.email || `${reference}@buildspark.co.ug`,
    });

    // Update transfer with PesaPal ref
    await prisma.moneyTransfer.update({
      where: { id: transfer.id },
      data: { pesapalRef: pesapalResult.order_tracking_id },
    });

    await createAuditLog({
      userId: session.user.id,
      projectId,
      action: "SEND_MONEY",
      resource: "MoneyTransfer",
      resourceId: transfer.id,
      details: { amount, toUserId, reference, paymentMethod },
    });

    return NextResponse.json({
      transfer,
      pesapal: pesapalResult,
      redirectUrl: pesapalResult.redirect_url,
    });
  } catch (err: any) {
    console.error("PesaPal error:", err);
    return NextResponse.json({ error: err.message || "Payment failed" }, { status: 500 });
  }
}
