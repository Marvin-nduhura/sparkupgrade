export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { oldPassword, newPassword } = await req.json();
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
    if (!user?.password) return NextResponse.json({ error: "Cannot change password for OAuth accounts" }, { status: 400 });

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed, passwordChangedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
