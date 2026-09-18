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
    const status = url.searchParams.get("status") || "";
    const projectId = url.searchParams.get("projectId") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "15");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }];
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({ where: { userId: session.user.id, isActive: true }, select: { projectId: true } });
      where.projectId = { in: assignments.map(a => a.projectId) };
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { project: { select: { name: true } }, requestedBy: { select: { name: true } }, items: true } }),
      prisma.request.count({ where }),
    ]);
    return NextResponse.json({ requests, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role === "ACCOUNTANT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { projectId, title, description, items, totalAmount } = await req.json();

    if (session.user.role === "SITE_MANAGER") {
      const assignment = await prisma.projectAssignment.findFirst({ where: { projectId, userId: session.user.id, isActive: true } });
      if (!assignment) return NextResponse.json({ error: "No access to this project" }, { status: 403 });
    }

    const request = await prisma.request.create({
      data: {
        projectId, title, description, totalAmount: totalAmount || 0, requestedById: session.user.id,
        items: { create: items.map((item: any) => ({ itemName: item.itemName, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, totalPrice: item.quantity * item.unitPrice, category: item.category as any, description: item.description })) },
      },
      include: { items: true },
    });
    await createAuditLog({ userId: session.user.id, projectId, action: "CREATE", resource: "Request", resourceId: request.id, details: { title, itemCount: items.length, totalAmount } });
    return NextResponse.json(request, { status: 201 });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
