import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { ProjectDetailContent } from "@/components/projects/project-detail-content";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Check access for site managers
  if (session.user.role === "SITE_MANAGER") {
    const assignment = await prisma.projectAssignment.findFirst({
      where: { projectId: params.id, userId: session.user.id, isActive: true },
    });
    if (!assignment) {
      redirect("/dashboard/projects");
    }
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: { user: { select: { id: true, name: true, avatar: true, role: true, phone: true } } },
      },
      moneyReceived: { orderBy: { receivedDate: "desc" }, take: 10 },
      purchases: {
        orderBy: { purchaseDate: "desc" },
        take: 10,
        include: {
          items: { include: { item: { select: { name: true, unit: true } } } },
          installments: { orderBy: { paymentDate: "desc" } },
          receipt: true,
        },
      },
      requests: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { requestedBy: { select: { name: true } }, items: true },
      },
      utilities: { orderBy: { usageDate: "desc" }, take: 10 },
      charges: { orderBy: { chargeDate: "desc" }, take: 10 },
      otherExpenses: { orderBy: { expenseDate: "desc" }, take: 10 },
      images: {
        orderBy: { takenAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
      inventory: {
        orderBy: { updatedAt: "desc" },
        include: { item: { select: { id: true, name: true, unit: true, category: true, unitPrice: true, currentQuantity: true, minimumQuantity: true } } },
      },
      _count: { select: { purchases: true, requests: true, images: true, moneyReceived: true } },
    },
  });

  if (!project) notFound();

  const totalReceived = project.moneyReceived.reduce((s, m) => s + m.amount, 0);
  const totalSpent = project.purchases.reduce((s, p) => s + p.totalAmount, 0)
    + project.utilities.reduce((s, u) => s + u.amount, 0)
    + project.charges.reduce((s, c) => s + c.amount, 0)
    + project.otherExpenses.reduce((s, o) => s + o.amount, 0);

  return (
    <ProjectDetailContent
      project={JSON.parse(JSON.stringify(project))}
      session={session}
      totalReceived={totalReceived}
      totalSpent={totalSpent}
    />
  );
}
