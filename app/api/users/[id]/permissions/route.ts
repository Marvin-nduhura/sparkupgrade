export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN");
    const permissions = await prisma.userPermission.findMany({ where: { userId: params.id } });
    return NextResponse.json(permissions);
  } catch (err) { return handleApiError(err); }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, "SYSTEM_ADMIN");
    const { permissions } = await req.json();

    await prisma.userPermission.deleteMany({ where: { userId: params.id } });
    if (permissions?.length) {
      await prisma.userPermission.createMany({
        data: permissions.map((p: any) => ({ userId: params.id, permission: p.permission, granted: p.granted })),
      });
    }
    await createAuditLog({ userId: session!.user.id, action: "UPDATE", resource: "UserPermissions", resourceId: params.id, details: { count: permissions?.length } });
    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
