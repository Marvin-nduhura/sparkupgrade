export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { userHasPermission } from "@/lib/access";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const role = url.searchParams.get("role") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const isAdmin = session.user.role === "SYSTEM_ADMIN";
    const canSend = await userHasPermission(session.user.id, session.user.role, "send_money");
    if (!isAdmin && !canSend) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const where: any = {};
    if (!isAdmin) where.role = "SITE_MANAGER";
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }
    if (isAdmin && role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          avatar: true,
          phone: true,
          lastLogin: true,
          createdAt: true,
          mtnNumber: true,
          airtelNumber: true,
          permissions: true,
          managedProjects: {
            where: { isActive: true },
            include: { project: { select: { name: true } } },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SYSTEM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, email, password, role, phone } = await req.json();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, phone },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "User",
      resourceId: user.id,
      details: { name, email, role },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
