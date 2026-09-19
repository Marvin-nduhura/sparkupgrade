import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Ensure role is always set
  if (!session.user.role) {
    redirect("/login");
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}
