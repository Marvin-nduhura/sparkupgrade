import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { saveUploadedFile } from "@/lib/upload";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({ where: { userId: session.user.id, isActive: true }, select: { projectId: true } });
      where.projectId = { in: assignments.map(a => a.projectId) };
    }

    const [images, total] = await Promise.all([
      prisma.projectImage.findMany({
        where, skip, take: limit, orderBy: { takenAt: "desc" },
        include: { project: { select: { name: true } }, uploadedBy: { select: { name: true } } },
      }),
      prisma.projectImage.count({ where }),
    ]);

    return NextResponse.json({ images, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role === "ACCOUNTANT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const formData = await req.formData();
    const projectId = formData.get("projectId") as string;
    const collectionName = formData.get("collectionName") as string;
    const description = formData.get("description") as string;
    const imageFiles = formData.getAll("images") as File[];

    if (!imageFiles.length) return NextResponse.json({ error: "No images provided" }, { status: 400 });

    if (session.user.role === "SITE_MANAGER") {
      const assignment = await prisma.projectAssignment.findFirst({ where: { projectId, userId: session.user.id, isActive: true } });
      if (!assignment) return NextResponse.json({ error: "No access to this project" }, { status: 403 });
    }

    const created = await Promise.all(
      imageFiles.map(async (file) => {
        const imageUrl = await saveUploadedFile(file, `projects/${projectId}`, ["image/jpeg", "image/png", "image/webp", "image/gif"]);
        return prisma.projectImage.create({
          data: { projectId, uploadedById: session!.user.id, imageUrl, fileName: file.name, collectionName: collectionName || undefined, description: description || undefined },
        });
      })
    );

    await createAuditLog({ userId: session!.user.id, projectId, action: "UPLOAD", resource: "ProjectImage", details: { count: created.length, collectionName } });
    return NextResponse.json({ images: created, count: created.length }, { status: 201 });
  } catch (err) { return handleApiError(err); }
}
