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

    const id = params.id;

    // Delete all child records in dependency order before deleting the project
    // (Foreign key constraints don't all have CASCADE, so we do it manually)
    await prisma.auditLog.deleteMany({ where: { projectId: id } });
    await prisma.notification.deleteMany({ where: { projectId: id } });
    await prisma.inventoryUsage.deleteMany({ where: { projectId: id } });
    await prisma.projectImage.deleteMany({ where: { projectId: id } });

    // Purchases → items + installments first
    const purchases = await prisma.purchase.findMany({ where: { projectId: id }, select: { id: true } });
    const purchaseIds = purchases.map(p => p.id);
    if (purchaseIds.length) {
      await prisma.purchaseItem.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
      await prisma.installment.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
    }
    await prisma.purchase.deleteMany({ where: { projectId: id } });

    // Requests → items first
    const requests = await prisma.request.findMany({ where: { projectId: id }, select: { id: true } });
    if (requests.length) {
      await prisma.requestItem.deleteMany({ where: { requestId: { in: requests.map(r => r.id) } } });
    }
    await prisma.request.deleteMany({ where: { projectId: id } });

    await prisma.moneyReceived.deleteMany({ where: { projectId: id } });
    await prisma.utility.deleteMany({ where: { projectId: id } });
    await prisma.siteCharge.deleteMany({ where: { projectId: id } });
    await prisma.otherExpense.deleteMany({ where: { projectId: id } });
    await prisma.projectInventory.deleteMany({ where: { projectId: id } });
    await prisma.projectAssignment.deleteMany({ where: { projectId: id } });

    await prisma.project.delete({ where: { id } });

    await createAuditLog({ userId: session!.user.id, action: "DELETE", resource: "Project", resourceId: id });
    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
