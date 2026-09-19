export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "";
    const q = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "24");
    const skip = (page - 1) * limit;

    // Get project IDs for site manager
    let projectIds: string[] | undefined;
    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({
        where: { userId: session.user.id, isActive: true }, select: { projectId: true },
      });
      projectIds = assignments.map(a => a.projectId);
    }

    const fileWhere: any = {};
    if (q) fileWhere.fileName = { contains: q, mode: "insensitive" };

    // Collect receipts from all sources
    const allReceipts: any[] = [];

    const addSource = async (source: string, items: any[]) => {
      items.forEach(item => {
        if (item.receipt) allReceipts.push({ ...item.receipt, _source: source });
      });
    };

    if (!type || type === "purchases") {
      const purchases = await prisma.purchase.findMany({
        where: { receipt: { isNot: null }, ...(projectIds ? { projectId: { in: projectIds } } : {}) },
        select: { receipt: true }, take: type ? limit * 3 : 20,
      });
      await addSource("purchase", purchases);
    }

    if (!type || type === "installments") {
      const installments = await prisma.installment.findMany({
        where: { receipt: { isNot: null } },
        select: { receipt: true, purchase: { select: { projectId: true } } },
        take: type ? limit * 3 : 20,
      });
      const filtered = projectIds
        ? installments.filter(i => projectIds!.includes(i.purchase.projectId))
        : installments;
      await addSource("installment", filtered);
    }

    if (!type || type === "utilities") {
      const utils = await prisma.utility.findMany({
        where: { receipt: { isNot: null }, ...(projectIds ? { projectId: { in: projectIds } } : {}) },
        select: { receipt: true }, take: type ? limit * 3 : 20,
      });
      await addSource("utility", utils);
    }

    if (!type || type === "charges") {
      const charges = await prisma.siteCharge.findMany({
        where: { receipt: { isNot: null }, ...(projectIds ? { projectId: { in: projectIds } } : {}) },
        select: { receipt: true }, take: type ? limit * 3 : 20,
      });
      await addSource("charge", charges);
    }

    if (!type || type === "other") {
      const others = await prisma.otherExpense.findMany({
        where: { receipt: { isNot: null }, ...(projectIds ? { projectId: { in: projectIds } } : {}) },
        select: { receipt: true }, take: type ? limit * 3 : 20,
      });
      await addSource("other", others);
    }

    if ((!type || type === "office") && session.user.role !== "SITE_MANAGER") {
      const office = await prisma.officeExpense.findMany({
        where: { receipt: { isNot: null } },
        select: { receipt: true }, take: type ? limit * 3 : 20,
      });
      await addSource("office", office);
    }

    // Deduplicate by receipt ID
    const seen = new Set<string>();
    const unique = allReceipts.filter(r => { if (!r || !r.id || seen.has(r.id)) return false; seen.add(r.id); return true; });

    // Filter by search
    const filtered = q ? unique.filter(r => r.fileName?.toLowerCase().includes(q.toLowerCase())) : unique;

    // Sort by upload date
    filtered.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return NextResponse.json({
      receipts: paginated,
      pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) { return handleApiError(err); }
}
