export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await prisma.inventoryItem.findMany({
      orderBy: { purchaseItems: { _count: "desc" } },
      take: 8,
      select: {
        id: true, name: true, unit: true, unitPrice: true, category: true,
        currentQuantity: true, minimumQuantity: true,
        _count: { select: { purchaseItems: true } },
      },
    });

    const max = items[0]?._count?.purchaseItems || 1;
    return NextResponse.json({ items, max });
  } catch (err) { return handleApiError(err); }
}
