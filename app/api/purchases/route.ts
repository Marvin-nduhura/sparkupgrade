export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { saveReceiptWithAI } from "@/lib/receipt";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    const status = url.searchParams.get("status") || "";

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.paymentStatus = status;

    // Site managers only see their projects
    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({
        where: { userId: session.user.id, isActive: true },
        select: { projectId: true },
      });
      where.projectId = { in: assignments.map((a) => a.projectId) };
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchaseDate: "desc" },
        include: {
          project: { select: { name: true } },
          purchasedBy: { select: { name: true } },
          items: {
            include: { item: { select: { name: true, unit: true } } },
          },
          installments: { orderBy: { paymentDate: "desc" } },
          receipt: true,
        },
      }),
      prisma.purchase.count({ where }),
    ]);

    return NextResponse.json({
      purchases,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role === "ACCOUNTANT") {
      return NextResponse.json({ error: "Accountants cannot create purchases" }, { status: 403 });
    }

    const formData = await req.formData();
    const projectId = formData.get("projectId") as string;
    const purchaseDate = formData.get("purchaseDate") as string;
    const description = formData.get("description") as string;
    const itemsJson = formData.get("items") as string;
    const initialPayment = parseFloat(formData.get("initialPayment") as string || "0");
    const paymentMethod = formData.get("paymentMethod") as string;
    const receiptFile = formData.get("receipt") as File | null;

    // Verify project access
    if (session.user.role === "SITE_MANAGER") {
      const assignment = await prisma.projectAssignment.findFirst({
        where: { projectId, userId: session.user.id, isActive: true },
      });
      if (!assignment) {
        return NextResponse.json({ error: "No access to this project" }, { status: 403 });
      }
    }

    const items = JSON.parse(itemsJson);
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unitPrice,
      0
    );

    // Process receipt with AI
    let receiptId: string | undefined;
    let aiVerification: any = null;

      if (receiptFile) {
        try {
          const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
          const saved = await saveReceiptWithAI(receiptFile, {
            projectId,
            recordedById: session.user.id,
            expenseName: items.map((i: any) => i.itemName || i.name).join(", "),
            expenseAmount: totalAmount,
            expenseType: "purchase",
            items: items.map((i: any) => ({
              name: i.itemName || i.name,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.quantity * i.unitPrice,
            })),
            projectName: project?.name,
            purchasedBy: session.user.name,
          });
          receiptId = saved.receiptId;
          aiVerification = saved.aiVerification;
        } catch (e: any) {
          console.warn("Receipt save failed:", e.message);
        }
      }

    // Create purchase
    const purchase = await prisma.purchase.create({
      data: {
        projectId,
        purchasedById: session.user.id,
        totalAmount,
        amountPaid: initialPayment,
        amountDue: totalAmount - initialPayment,
        paymentStatus: initialPayment >= totalAmount ? "COMPLETED" : "PARTIAL",
        purchaseDate: new Date(purchaseDate),
        description,
        receiptId,
        items: {
          create: await Promise.all(
            items.map(async (item: any) => {
              // Find or ensure the inventory item exists
              let inventoryItem = await prisma.inventoryItem.findUnique({
                where: { name: item.itemName || item.name },
              });

              if (!inventoryItem) {
                inventoryItem = await prisma.inventoryItem.create({
                  data: {
                    name: item.itemName || item.name,
                    unit: item.unit || "pcs",
                    category: item.category || "MATERIALS",
                    addedById: session.user.id,
                  },
                });
              }

              // Increase inventory (auto-restock on purchase)
              await prisma.inventoryItem.update({
                where: { id: inventoryItem.id },
                data: { currentQuantity: { increment: item.quantity } },
              });

              // Update project inventory
              await prisma.projectInventory.upsert({
                where: {
                  projectId_itemId: { projectId, itemId: inventoryItem.id },
                },
                create: { projectId, itemId: inventoryItem.id, quantity: item.quantity },
                update: { quantity: { increment: item.quantity } },
              });

              // Log restock in usage history
              await prisma.inventoryUsage.create({
                data: {
                  itemId: inventoryItem.id,
                  projectId,
                  recordedById: session.user.id,
                  quantity: item.quantity,
                  type: "RESTOCK",
                  description: `Auto-restocked via purchase`,
                  usedDate: new Date(purchaseDate),
                },
              });

              return {
                itemId: inventoryItem.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
              };
            })
          ),
        },
      },
      include: { items: { include: { item: true } }, receipt: true },
    });

    // Create initial installment if payment was made
    if (initialPayment > 0) {
      await prisma.installment.create({
        data: {
          purchaseId: purchase.id,
          amount: initialPayment,
          paymentMethod: (paymentMethod as any) || "CASH",
          paymentDate: new Date(purchaseDate),
          receiptId,
          verifiedByAi: aiVerification?.verified || false,
          aiVerification: aiVerification ? JSON.stringify(aiVerification) : undefined,
        },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      projectId,
      action: "CREATE",
      resource: "Purchase",
      resourceId: purchase.id,
      details: { totalAmount, itemCount: items.length },
    });

    return NextResponse.json(
      { purchase, aiVerification },
      { status: 201 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
