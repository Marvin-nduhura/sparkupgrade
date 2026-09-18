export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || "";
    const q = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (q) where.OR = [{ source: { contains: q, mode: "insensitive" } }, { reference: { contains: q, mode: "insensitive" } }];
    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({ where: { userId: session.user.id, isActive: true }, select: { projectId: true } });
      where.projectId = { in: assignments.map(a => a.projectId) };
    }

    const [records, total, totalAgg, thisMonthAgg] = await Promise.all([
      prisma.moneyReceived.findMany({ where, skip, take: limit, orderBy: { receivedDate: "desc" }, include: { project: { select: { name: true } }, receivedBy: { select: { name: true } } } }),
      prisma.moneyReceived.count({ where }),
      prisma.moneyReceived.aggregate({ where, _sum: { amount: true } }),
      prisma.moneyReceived.aggregate({ where: { ...where, receivedDate: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) } }, _sum: { amount: true } }),
    ]);

    return NextResponse.json({ records, pagination: { total, page, limit, pages: Math.ceil(total / limit) }, totals: { total: totalAgg._sum.amount || 0, thisMonth: thisMonthAgg._sum.amount || 0 } });
  } catch (err) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role === "ACCOUNTANT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { projectId, amount, source, paymentMethod, receivedDate, description, reference } = await req.json();

    if (session.user.role === "SITE_MANAGER") {
      const assignment = await prisma.projectAssignment.findFirst({ where: { projectId, userId: session.user.id, isActive: true } });
      if (!assignment) return NextResponse.json({ error: "No access to this project" }, { status: 403 });
    }

    const record = await prisma.moneyReceived.create({
      data: { projectId, amount, source, paymentMethod: paymentMethod as any, receivedDate: new Date(receivedDate), description, reference, receivedById: session.user.id },
    });
    await createAuditLog({ userId: session.user.id, projectId, action: "CREATE", resource: "MoneyReceived", resourceId: record.id, details: { amount, source } });
    return NextResponse.json(record, { status: 201 });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
