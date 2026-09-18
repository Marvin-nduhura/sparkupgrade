import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const category = url.searchParams.get("category") || "";
    const lowStock = url.searchParams.get("lowStock") === "true";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
    if (category) where.category = category;
    if (lowStock) {
      where.currentQuantity = { lte: prisma.inventoryItem.fields.minimumQuantity };
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          addedBy: { select: { name: true } },
          _count: { select: { purchaseItems: true } },
        },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // Check low stock
    const lowStockItems = items.filter(
      (item) => item.currentQuantity <= item.minimumQuantity && item.minimumQuantity > 0
    );

    return NextResponse.json({
      items,
      lowStockCount: lowStockItems.length,
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

    const body = await req.json();
    const { name, description, unit, category, minimumQuantity, currentQuantity, unitPrice } = body;

    // Check if item already exists
    const existing = await prisma.inventoryItem.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "Item already exists. Use the existing item.", existingId: existing.id },
        { status: 409 }
      );
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        description,
        unit,
        category,
        minimumQuantity: minimumQuantity || 0,
        currentQuantity: currentQuantity || 0,
        unitPrice: unitPrice || 0,
        addedById: session.user.id,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "InventoryItem",
      resourceId: item.id,
      details: { name, category, unit },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
