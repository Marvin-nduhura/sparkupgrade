export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/upload";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const status = url.searchParams.get("status") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;

    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({
        where: { userId: session.user.id, isActive: true },
        select: { projectId: true },
      });
      where.id = { in: assignments.map((a) => a.projectId) };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          assignments: {
            where: { isActive: true },
            include: { user: { select: { id: true, name: true, avatar: true } } },
          },
          moneyReceived: { select: { amount: true } },
          purchases: { select: { totalAmount: true } },
          _count: { select: { purchases: true, requests: true, images: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      projects,
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
    if (!session?.user || session.user.role !== "SYSTEM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const description = (formData.get("description") as string) || undefined;
    const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : undefined;
    const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : undefined;
    const budget = formData.get("budget") ? parseFloat(formData.get("budget") as string) : undefined;
    const startDate = (formData.get("startDate") as string) || undefined;
    const endDate = (formData.get("endDate") as string) || undefined;
    const image = formData.get("image") as File | null;

    let imageUrl: string | undefined;
    if (image && image.size > 0) {
      // saveUploadedFile handles production (base64 in DB) vs local (disk) automatically
      imageUrl = await saveUploadedFile(image, "projects", [
        "image/jpeg", "image/png", "image/webp", "image/gif",
      ]);
    }

    const project = await prisma.project.create({
      data: {
        name, location, description,
        latitude, longitude, budget, imageUrl,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
        createdById: session.user.id,
      },
    });

    await createAuditLog({
      userId: session.user.id, projectId: project.id,
      action: "CREATE", resource: "Project", resourceId: project.id,
      details: { name, location },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
