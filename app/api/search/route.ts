export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";

    if (!q || q.length < 2) return NextResponse.json({ results: [] });

    const results: any[] = [];

    // Projects
    let projectWhere: any = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
      ],
    };

    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({
        where: { userId: session.user.id, isActive: true },
        select: { projectId: true },
      });
      projectWhere.id = { in: assignments.map((a) => a.projectId) };
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
      take: 5,
      select: { id: true, name: true, location: true },
    });

    results.push(
      ...projects.map((p) => ({
        id: p.id,
        type: "project",
        title: p.name,
        subtitle: p.location,
        href: `/dashboard/projects/${p.id}`,
      }))
    );

    // Inventory
    const inventory = await prisma.inventoryItem.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, name: true, category: true, unit: true },
    });

    results.push(
      ...inventory.map((item) => ({
        id: item.id,
        type: "inventory",
        title: item.name,
        subtitle: `${item.category} • ${item.unit}`,
        href: `/dashboard/inventory`,
      }))
    );

    // Users (admin only)
    if (session.user.role === "SYSTEM_ADMIN") {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 3,
        select: { id: true, name: true, email: true, role: true },
      });

      results.push(
        ...users.map((u) => ({
          id: u.id,
          type: "user",
          title: u.name,
          subtitle: `${u.email} • ${u.role}`,
          href: `/dashboard/admin/users/${u.id}`,
        }))
      );
    }

    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
