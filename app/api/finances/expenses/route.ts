export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || "";
    const type = url.searchParams.get("type") || ""; // utilities | charges | other
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    let projectIds: string[] = [];
    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({ where: { userId: session.user.id, isActive: true }, select: { projectId: true } });
      projectIds = assignments.map(a => a.projectId);
    }

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (session.user.role === "SITE_MANAGER") where.projectId = { in: projectIds };

    let results: any[] = [];
    let total = 0;

    if (!type || type === "utilities") {
      const [items, count] = await Promise.all([
        prisma.utility.findMany({ where, skip: type ? skip : 0, take: type ? limit : 10, orderBy: { usageDate: "desc" }, include: { project: { select: { name: true } }, receipt: true } }),
        prisma.utility.count({ where }),
      ]);
      if (type === "utilities") { results = items; total = count; }
      else results.push(...items.map(i => ({ ...i, _type: "utility" })));
    }

    if (!type || type === "charges") {
      const [items, count] = await Promise.all([
        prisma.siteCharge.findMany({ where, skip: type ? skip : 0, take: type ? limit : 10, orderBy: { chargeDate: "desc" }, include: { project: { select: { name: true } }, receipt: true } }),
        prisma.siteCharge.count({ where }),
      ]);
      if (type === "charges") { results = items; total = count; }
      else results.push(...items.map(i => ({ ...i, _type: "charge" })));
    }

    if (!type || type === "other") {
      const [items, count] = await Promise.all([
        prisma.otherExpense.findMany({ where, skip: type ? skip : 0, take: type ? limit : 10, orderBy: { expenseDate: "desc" }, include: { project: { select: { name: true } }, receipt: true } }),
        prisma.otherExpense.count({ where }),
      ]);
      if (type === "other") { results = items; total = count; }
      else results.push(...items.map(i => ({ ...i, _type: "other" })));
    }

    return NextResponse.json({ expenses: results, pagination: { total: type ? total : results.length, page, limit, pages: Math.ceil((type ? total : results.length) / limit) } });
  } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role === "ACCOUNTANT") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { type, projectId, name, category, amount, paymentMethod, date, description } = await req.json();

    if (session.user.role === "SITE_MANAGER") {
      const assignment = await prisma.projectAssignment.findFirst({ where: { projectId, userId: session.user.id, isActive: true } });
      if (!assignment) return NextResponse.json({ error: "No access to this project" }, { status: 403 });
    }

    let record: any;
    if (type === "utility") {
      record = await prisma.utility.create({ data: { projectId, name, category, amount, paymentMethod, usageDate: new Date(date), description } });
    } else if (type === "charge") {
      record = await prisma.siteCharge.create({ data: { projectId, name, category, amount, paymentMethod, chargeDate: new Date(date), description } });
    } else {
      record = await prisma.otherExpense.create({ data: { projectId, name, category, amount, paymentMethod, expenseDate: new Date(date), description } });
    }

    await createAuditLog({ userId: session.user.id, projectId, action: "CREATE", resource: type, resourceId: record.id, details: { name, amount } });
    return NextResponse.json(record, { status: 201 });
  } catch (err) { return handleApiError(err); }
}
