import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { UserDetailContent } from "@/components/admin/user-detail-content";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SYSTEM_ADMIN") redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, email: true, role: true, isActive: true,
      phone: true, avatar: true, lastLogin: true, createdAt: true,
      mtnNumber: true, airtelNumber: true, bankAccount: true, bankName: true,
      permissions: true,
      managedProjects: {
        include: {
          project: { select: { id: true, name: true, location: true, status: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  if (!user) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: params.id },
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { project: { select: { name: true } } },
  });

  return <UserDetailContent user={JSON.parse(JSON.stringify(user))} auditLogs={JSON.parse(JSON.stringify(auditLogs))} />;
}
