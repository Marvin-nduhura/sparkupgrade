export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const page = parseInt(url.searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    const [notifications, unreadCount, total] = await Promise.all([
      prisma.userNotification.findMany({
        where: { userId: session.user.id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          notification: {
            include: {
              sentBy: { select: { name: true, avatar: true } },
              project: { select: { name: true } },
            },
          },
        },
      }),
      prisma.userNotification.count({
        where: { userId: session.user.id, isRead: false },
      }),
      prisma.userNotification.count({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SYSTEM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { title, message, priority, projectId, userIds, isGlobal } = await req.json();

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        priority: priority || "MEDIUM",
        projectId: projectId || undefined,
        sentById: session.user.id,
        isGlobal: isGlobal || false,
      },
    });

    let recipientIds: string[] = [];

    if (isGlobal) {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      recipientIds = users.map((u) => u.id);
    } else if (projectId) {
      const assignments = await prisma.projectAssignment.findMany({
        where: { projectId, isActive: true },
        select: { userId: true },
      });
      recipientIds = assignments.map((a) => a.userId);
    } else if (userIds?.length) {
      recipientIds = userIds;
    }

    // Create user notifications
    if (recipientIds.length > 0) {
      await prisma.userNotification.createMany({
        data: recipientIds.map((userId) => ({
          userId,
          notificationId: notification.id,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(notification, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
