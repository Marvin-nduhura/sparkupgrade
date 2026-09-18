import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN");
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, role: true, isActive: true,
        phone: true, avatar: true, lastLogin: true, createdAt: true,
        mtnNumber: true, airtelNumber: true, bankAccount: true, bankName: true,
        themePreference: true, colorScheme: true, permissions: true,
        managedProjects: {
          where: { isActive: true },
          include: { project: { select: { id: true, name: true, location: true, status: true } } },
        },
      },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) { return handleApiError(err); }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Users can update their own profile; admins can update anyone
    if (session.user.role !== "SYSTEM_ADMIN" && session.user.id !== params.id) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.mtnNumber !== undefined) updateData.mtnNumber = body.mtnNumber;
    if (body.airtelNumber !== undefined) updateData.airtelNumber = body.airtelNumber;
    if (body.bankAccount !== undefined) updateData.bankAccount = body.bankAccount;
    if (body.bankName !== undefined) updateData.bankName = body.bankName;
    if (body.themePreference !== undefined) updateData.themePreference = body.themePreference;
    if (body.colorScheme !== undefined) updateData.colorScheme = body.colorScheme;

    // Admin-only fields
    if (session.user.role === "SYSTEM_ADMIN") {
      if (body.role !== undefined) updateData.role = body.role;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
      if (body.newPassword) {
        updateData.password = await bcrypt.hash(body.newPassword, 12);
        updateData.passwordChangedAt = new Date();
      }
    }

    const user = await prisma.user.update({ where: { id: params.id }, data: updateData });
    await createAuditLog({
      userId: session.user.id, action: "UPDATE", resource: "User",
      resourceId: params.id, details: { updatedFields: Object.keys(updateData) },
    });
    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) { return handleApiError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN");
    if (params.id === session!.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }
    // Soft delete - deactivate to preserve audit trail
    await prisma.user.update({ where: { id: params.id }, data: { isActive: false } });
    await createAuditLog({ userId: session!.user.id, action: "DELETE", resource: "User", resourceId: params.id });
    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
