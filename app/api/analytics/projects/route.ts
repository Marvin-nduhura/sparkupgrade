export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const statuses = ["ACTIVE", "PLANNING", "ON_HOLD", "COMPLETED", "CANCELLED"];
    const colors: Record<string, string> = {
      ACTIVE: "#22c55e",
      PLANNING: "#3b82f6",
      ON_HOLD: "#f59e0b",
      COMPLETED: "#6366f1",
      CANCELLED: "#ef4444",
    };

    const statusData = await Promise.all(
      statuses.map(async (status) => {
        const count = await prisma.project.count({ where: { status: status as any } });
        return { name: status.charAt(0) + status.slice(1).toLowerCase().replace("_", " "), value: count, color: colors[status] };
      })
    );

    return NextResponse.json({ statusData: statusData.filter((d) => d.value > 0) });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
