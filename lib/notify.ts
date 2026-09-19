import { prisma } from "@/lib/prisma";

type AutoType = "LOW_STOCK" | "NEW_REQUEST" | "PAYMENT_RECEIVED" | "USAGE_RECORDED";

export async function sendAutoNotification(type: AutoType, data: Record<string, any>) {
  try {
    const [admins, accountants] = await Promise.all([
      prisma.user.findMany({ where: { role: "SYSTEM_ADMIN", isActive: true }, select: { id: true } }),
      prisma.user.findMany({ where: { role: "ACCOUNTANT", isActive: true }, select: { id: true } }),
    ]);

    const senderId = admins[0]?.id;
    if (!senderId) return;

    let title = "";
    let message = "";
    let priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "MEDIUM";
    let extraRecipients: string[] = [];

    if (type === "LOW_STOCK") {
      title = "Low Stock Alert";
      message = `${data.itemName} is running low: ${data.currentQuantity} ${data.unit} remaining (minimum ${data.minimumQuantity} ${data.unit}). Consider restocking.`;
      priority = "HIGH";
    } else if (type === "NEW_REQUEST") {
      title = "New Request Submitted";
      message = `${data.requestedBy} submitted "${data.requestTitle}" for ${data.projectName}. Amount: UGX ${Number(data.amount || 0).toLocaleString()}.`;
    } else if (type === "PAYMENT_RECEIVED") {
      title = "Payment Received";
      message = `UGX ${Number(data.amount || 0).toLocaleString()} received for ${data.projectName} from ${data.source}.`;
      priority = "HIGH";
    } else if (type === "USAGE_RECORDED") {
      title = "Inventory Used On Site";
      message = `${data.quantity} ${data.unit} of ${data.itemName} used on ${data.projectName || "a project"}.`;
      extraRecipients = data.managerIds || [];
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        priority,
        sentById: senderId,
        projectId: data.projectId || undefined,
      },
    });

    const recipientIds = [...admins, ...accountants]
      .map((u) => u.id)
      .concat(extraRecipients)
      .filter((id, i, arr) => arr.indexOf(id) === i);

    if (recipientIds.length) {
      await prisma.userNotification.createMany({
        data: recipientIds.map((userId) => ({ userId, notificationId: notification.id })),
        skipDuplicates: true,
      });
    }
  } catch (err) {
    console.error("Auto notification failed:", err);
  }
}

export async function maybeNotifyLowStock(item: {
  name: string;
  currentQuantity: number;
  minimumQuantity: number;
  unit: string;
}) {
  if (item.minimumQuantity > 0 && item.currentQuantity <= item.minimumQuantity) {
    await sendAutoNotification("LOW_STOCK", {
      itemName: item.name,
      currentQuantity: item.currentQuantity,
      minimumQuantity: item.minimumQuantity,
      unit: item.unit,
    });
  }
}
