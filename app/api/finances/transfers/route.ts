export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN", "ACCOUNTANT");

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    const status = url.searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;

    const [transfers, total] = await Promise.all([
      prisma.moneyTransfer.findMany({
        where, skip, take: limit, orderBy: { sentAt: "desc" },
        include: {
          sentBy: { select: { name: true, avatar: true } },
          receivedBy: { select: { name: true, avatar: true, mtnNumber: true, airtelNumber: true } },
          moneyReceived: { select: { id: true, projectId: true } },
        },
      }),
      prisma.moneyTransfer.count({ where }),
    ]);

    const totalAmount = await prisma.moneyTransfer.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } });

    return NextResponse.json({
      transfers, pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      totalSent: totalAmount._sum.amount || 0,
    });
  } catch (err) { return handleApiError(err); }
}
