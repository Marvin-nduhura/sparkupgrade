export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { getAssignedProjectIds } from "@/lib/access";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role === "SITE_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const managers = await prisma.user.findMany({
      where: {
        role: "SITE_MANAGER",
        isActive: true,
        lastLatitude: { not: null },
        lastLongitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        lastLatitude: true,
        lastLongitude: true,
        lastLocationAt: true,
        managedProjects: {
          where: { isActive: true },
          include: {
            project: {
              select: { id: true, name: true, latitude: true, longitude: true, location: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ managers });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { latitude, longitude } = await req.json();
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "Valid coordinates required" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
