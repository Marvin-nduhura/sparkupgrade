export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN");

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "30");
    const skip = (page - 1) * limit;
    const action = url.searchParams.get("action") || "";
    const resource = url.searchParams.get("resource") || "";
    const userId = url.searchParams.get("userId") || "";
    const projectId = url.searchParams.get("projectId") || "";
    const q = url.searchParams.get("q") || "";

    const where: any = {};
    if (action) where.action = action;
    if (resource) where.resource = { contains: resource, mode: "insensitive" };
    if (userId) where.userId = userId;
    if (projectId) where.projectId = projectId;
    if (q) {
      where.OR = [
        { resource: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, avatar: true, role: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { return handleApiError(err); }
}
