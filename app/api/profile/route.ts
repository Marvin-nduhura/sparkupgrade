import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { saveUploadedFile } from "@/lib/upload";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const avatarFile = formData.get("avatar") as File | null;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    if (avatarFile) {
      const avatarUrl = await saveUploadedFile(avatarFile, "avatars", ["image/jpeg", "image/png", "image/webp"]);
      updateData.avatar = avatarUrl;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, avatar: true, phone: true },
    });

    await createAuditLog({ userId: session.user.id, action: "UPDATE", resource: "Profile", details: { updatedFields: Object.keys(updateData) } });
    return NextResponse.json(user);
  } catch (err) { return handleApiError(err); }
}
