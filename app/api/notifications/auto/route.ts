export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called internally to send automatic notifications
// e.g., low stock alerts, new request notifications

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();
    const adminUsers = await prisma.user.findMany({
      where: { role: "SYSTEM_ADMIN", isActive: true }, select: { id: true },
    });
    const accountants = await prisma.user.findMany({
      where: { role: "ACCOUNTANT", isActive: true }, select: { id: true },
    });

    let notification: any;

    if (type === "LOW_STOCK") {
      const { itemName, currentQuantity, minimumQuantity, unit } = data;
      notification = await prisma.notification.create({
        data: {
          title: "⚠️ Low Stock Alert",
          message: `${itemName} is running low: ${currentQuantity} ${unit} remaining (minimum: ${minimumQuantity} ${unit}). Consider restocking.`,
          priority: "HIGH",
          sentById: adminUsers[0]?.id || "system",
          isGlobal: false,
        },
      });
      // Notify admins and accountants
      const recipients = [...adminUsers, ...accountants].map(u => ({ userId: u.id, notificationId: notification.id }));
      if (recipients.length > 0) {
        await prisma.userNotification.createMany({ data: recipients, skipDuplicates: true });
      }
    }

    if (type === "NEW_REQUEST") {
      const { requestTitle, projectName, requestedBy, amount } = data;
      notification = await prisma.notification.create({
        data: {
          title: "📋 New Request Submitted",
          message: `${requestedBy} submitted a new request "${requestTitle}" for ${projectName}. Amount: UGX ${Number(amount).toLocaleString()}.`,
          priority: "MEDIUM",
          sentById: adminUsers[0]?.id || "system",
        },
      });
      const recipients = [...adminUsers, ...accountants].map(u => ({ userId: u.id, notificationId: notification.id }));
      if (recipients.length > 0) {
        await prisma.userNotification.createMany({ data: recipients, skipDuplicates: true });
      }
    }

    if (type === "PAYMENT_RECEIVED") {
      const { amount, projectName, source } = data;
      notification = await prisma.notification.create({
        data: {
          title: "💰 Payment Received",
          message: `UGX ${Number(amount).toLocaleString()} received for ${projectName} from ${source}.`,
          priority: "HIGH",
          sentById: adminUsers[0]?.id || "system",
        },
      });
      const recipients = [...adminUsers, ...accountants].map(u => ({ userId: u.id, notificationId: notification.id }));
      if (recipients.length > 0) {
        await prisma.userNotification.createMany({ data: recipients, skipDuplicates: true });
      }
    }

    return NextResponse.json({ success: true, notificationId: notification?.id });
  } catch (err: any) {
    console.error("Auto notification error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
