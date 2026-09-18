import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTransactionStatus } from "@/lib/pesapal";

// PesaPal IPN handler - receives payment notifications
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderTrackingId, orderMerchantReference, orderNotificationType } = body;

    if (!orderTrackingId) {
      return NextResponse.json({ error: "Missing tracking ID" }, { status: 400 });
    }

    // Get transaction status from PesaPal
    const status = await getTransactionStatus(orderTrackingId);

    // Find the transfer
    const transfer = await prisma.moneyTransfer.findFirst({
      where: {
        OR: [
          { pesapalRef: orderTrackingId },
          { reference: orderMerchantReference },
        ],
      },
    });

    if (!transfer) {
      return NextResponse.json({ orderNotificationType: "IPNCHANGE", orderTrackingId, orderMerchantReference });
    }

    if (status.status === "COMPLETED") {
      // Update transfer status
      await prisma.moneyTransfer.update({
        where: { id: transfer.id },
        data: { status: "COMPLETED", confirmedAt: new Date() },
      });

      // Create money received record if project assigned
      if (transfer.projectId) {
        await prisma.moneyReceived.create({
          data: {
            projectId: transfer.projectId,
            amount: transfer.amount,
            source: "Admin Transfer",
            paymentMethod: transfer.paymentMethod,
            receivedDate: new Date(),
            description: transfer.description || "Funds transferred from admin",
            reference: transfer.reference,
            receivedById: transfer.toUserId,
            transferId: transfer.id,
          },
        });
      }

      // Send notification to recipient
      const notification = await prisma.notification.create({
        data: {
          title: "💰 Money Received",
          message: `You have received UGX ${transfer.amount.toLocaleString()} via ${transfer.paymentMethod.replace("_", " ")}. Reference: ${transfer.reference}`,
          priority: "HIGH",
          projectId: transfer.projectId || undefined,
          sentById: transfer.fromUserId,
        },
      });

      await prisma.userNotification.create({
        data: {
          userId: transfer.toUserId,
          notificationId: notification.id,
        },
      });
    } else if (status.status === "FAILED") {
      await prisma.moneyTransfer.update({
        where: { id: transfer.id },
        data: { status: "FAILED" },
      });
    }

    // Acknowledge IPN
    return NextResponse.json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId,
      orderMerchantReference,
    });
  } catch (err) {
    console.error("IPN error:", err);
    return NextResponse.json({ error: "IPN error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // PesaPal IPN verification
  const url = new URL(req.url);
  const orderTrackingId = url.searchParams.get("OrderTrackingId");
  const orderMerchantReference = url.searchParams.get("OrderMerchantReference");

  if (orderTrackingId) {
    return NextResponse.json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId,
      orderMerchantReference,
    });
  }

  return NextResponse.json({ status: "IPN endpoint active" });
}
