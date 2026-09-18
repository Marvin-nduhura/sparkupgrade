import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectsContent } from "@/components/projects/projects-content";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const role = session.user.role;
  const userId = session.user.id;

  let projects: any[] = [];

  if (role === "SYSTEM_ADMIN" || role === "ACCOUNTANT") {
    projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        assignments: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        _count: {
          select: { purchases: true, requests: true, images: true },
        },
        moneyReceived: { select: { amount: true } },
        purchases: { select: { totalAmount: true, amountPaid: true } },
      },
    });
  } else if (role === "SITE_MANAGER") {
    const assignments = await prisma.projectAssignment.findMany({
      where: { userId, isActive: true },
      include: {
        project: {
          include: {
            createdBy: { select: { name: true } },
            assignments: {
              where: { isActive: true },
              include: { user: { select: { id: true, name: true, avatar: true } } },
            },
            _count: {
              select: { purchases: true, requests: true, images: true },
            },
            moneyReceived: { select: { amount: true } },
            purchases: { select: { totalAmount: true, amountPaid: true } },
          },
        },
      },
    });
    projects = assignments.map((a) => a.project);
  }

  return (
    <ProjectsContent
      initialProjects={JSON.parse(JSON.stringify(projects))}
      session={session}
    />
  );
}
