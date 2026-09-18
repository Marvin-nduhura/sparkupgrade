export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/upload";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role === "SITE_MANAGER") {
      const assignment = await prisma.projectAssignment.findFirst({
        where: { projectId: params.id, userId: session.user.id, isActive: true },
      });
      if (!assignment) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: { user: { select: { id: true, name: true, avatar: true, role: true, phone: true } } },
        },
        moneyReceived: { orderBy: { receivedDate: "desc" }, take: 20 },
        purchases: {
          orderBy: { purchaseDate: "desc" }, take: 20,
          include: {
            items: { include: { item: { select: { name: true, unit: true } } } },
            installments: { orderBy: { paymentDate: "desc" } },
            receipt: true,
          },
        },
        requests: { orderBy: { createdAt: "desc" }, take: 10, include: { requestedBy: { select: { name: true } }, items: true } },
        utilities: { orderBy: { usageDate: "desc" }, take: 20 },
        charges: { orderBy: { chargeDate: "desc" }, take: 20 },
        otherExpenses: { orderBy: { expenseDate: "desc" }, take: 20 },
        images: { orderBy: { takenAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
        _count: { select: { purchases: true, requests: true, images: true, moneyReceived: true } },
      },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Site managers can update limited fields only within 24h
    const isAdmin = session.user.role === "SYSTEM_ADMIN";
    if (!isAdmin && session.user.role !== "SITE_MANAGER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    let body: any;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
      const imageFile = formData.get("image") as File | null;
      if (imageFile) {
        body.imageUrl = await saveUploadedFile(imageFile, "projects", ["image/jpeg", "image/png", "image/webp"]);
      }
    } else {
      body = await req.json();
    }

    const allowedFields: any = {};
    if (isAdmin) {
      const { name, location, description, status, budget, latitude, longitude, endDate, imageUrl } = body;
      if (name) allowedFields.name = name;
      if (location) allowedFields.location = location;
      if (description !== undefined) allowedFields.description = description;
      if (status) allowedFields.status = status;
      if (budget !== undefined) allowedFields.budget = parseFloat(budget);
      if (latitude !== undefined) allowedFields.latitude = parseFloat(latitude);
      if (longitude !== undefined) allowedFields.longitude = parseFloat(longitude);
      if (endDate) allowedFields.endDate = new Date(endDate);
      if (imageUrl) allowedFields.imageUrl = imageUrl;
    }

    const project = await prisma.project.update({ where: { id: params.id }, data: allowedFields });
    await createAuditLog({ userId: session.user.id, projectId: params.id, action: "UPDATE", resource: "Project", resourceId: params.id, details: Object.keys(allowedFields) });
    return NextResponse.json(project);
  } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN");
    await prisma.project.delete({ where: { id: params.id } });
    await createAuditLog({ userId: session!.user.id, action: "DELETE", resource: "Project", resourceId: params.id });
    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
