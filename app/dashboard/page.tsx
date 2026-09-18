import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const role = session.user.role;
  const userId = session.user.id;

  // Fetch dashboard stats based on role
  let stats: any = {};
  let recentActivity: any[] = [];
  let assignedProjects: any[] = [];

  try {
    if (role === "SYSTEM_ADMIN" || role === "ACCOUNTANT") {
      const [projects, totalReceived, totalSpent, pendingRequests, users] =
        await Promise.all([
          prisma.project.count({ where: { status: "ACTIVE" } }),
          prisma.moneyReceived.aggregate({ _sum: { amount: true } }),
          prisma.purchase.aggregate({ _sum: { totalAmount: true } }),
          prisma.request.count({ where: { status: "PENDING" } }),
          prisma.user.count({ where: { isActive: true } }),
        ]);

      const recentProjects = await prisma.project.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          assignments: {
            where: { isActive: true },
            include: { user: { select: { name: true, avatar: true } } },
          },
          _count: { select: { purchases: true } },
        },
      });

      stats = {
        activeProjects: projects,
        totalReceived: totalReceived._sum.amount || 0,
        totalSpent: totalSpent._sum.totalAmount || 0,
        pendingRequests,
        activeUsers: users,
      };
      assignedProjects = recentProjects;
    } else if (role === "SITE_MANAGER") {
      const myProjects = await prisma.projectAssignment.findMany({
        where: { userId, isActive: true },
        include: {
          project: {
            include: {
              _count: { select: { purchases: true, requests: true } },
              moneyReceived: { select: { amount: true } },
              purchases: { select: { totalAmount: true, amountPaid: true, amountDue: true } },
            },
          },
        },
      });

      const projectIds = myProjects.map((p) => p.projectId);

      const [pendingRequests, recentPurchases] = await Promise.all([
        prisma.request.count({
          where: { projectId: { in: projectIds }, status: "PENDING" },
        }),
        prisma.purchase.findMany({
          where: { projectId: { in: projectIds } },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            project: { select: { name: true } },
            items: { include: { item: { select: { name: true } } } },
          },
        }),
      ]);

      const totalReceived = myProjects.reduce((sum, p) => {
        return sum + p.project.moneyReceived.reduce((s, m) => s + m.amount, 0);
      }, 0);

      const totalSpent = myProjects.reduce((sum, p) => {
        return sum + p.project.purchases.reduce((s, pur) => s + pur.totalAmount, 0);
      }, 0);

      stats = {
        activeProjects: myProjects.length,
        totalReceived,
        totalSpent,
        pendingRequests,
      };
      assignedProjects = myProjects.map((a) => a.project);
    }

    // Recent audit logs
    recentActivity = await prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, avatar: true, role: true } },
      },
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
  }

  return (
    <DashboardContent
      session={session}
      stats={stats}
      recentActivity={recentActivity}
      assignedProjects={assignedProjects}
    />
  );
}
