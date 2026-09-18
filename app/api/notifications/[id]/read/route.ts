export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await prisma.userNotification.updateMany({
      where: { id: params.id, userId: session.user.id },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (err) { return handleApiError(err); }
}
