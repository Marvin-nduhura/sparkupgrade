export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { saveReceiptWithAI } from "@/lib/receipt";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || "";
    const type = url.searchParams.get("type") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const projectWhere: any = {};
    if (projectId) projectWhere.projectId = projectId;
    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({
        where: { userId: session.user.id, isActive: true }, select: { projectId: true },
      });
      const ids = assignments.map(a => a.projectId);
      projectWhere.projectId = projectId ? (ids.includes(projectId) ? projectId : "__none__") : { in: ids };
    }

    let results: any[] = [];
    let total = 0;

    if (!type || type === "utilities") {
      const [items, count] = await Promise.all([
        prisma.utility.findMany({ where: projectWhere, skip: type ? skip : 0, take: type ? limit : 50, orderBy: { usageDate: "desc" }, include: { project: { select: { name: true } }, receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true, aiResult: true } } } }),
        prisma.utility.count({ where: projectWhere }),
      ]);
      if (type === "utilities") { results = items; total = count; }
      else results.push(...items.map(i => ({ ...i, _type: "utility" })));
    }

    if (!type || type === "charges") {
      const [items, count] = await Promise.all([
        prisma.siteCharge.findMany({ where: projectWhere, skip: type ? skip : 0, take: type ? limit : 50, orderBy: { chargeDate: "desc" }, include: { project: { select: { name: true } }, receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true, aiResult: true } } } }),
        prisma.siteCharge.count({ where: projectWhere }),
      ]);
      if (type === "charges") { results = items; total = count; }
      else results.push(...items.map(i => ({ ...i, _type: "charge" })));
    }

    if (!type || type === "other") {
      const [items, count] = await Promise.all([
        prisma.otherExpense.findMany({ where: projectWhere, skip: type ? skip : 0, take: type ? limit : 50, orderBy: { expenseDate: "desc" }, include: { project: { select: { name: true } }, receipt: { select: { id: true, fileUrl: true, fileName: true, fileType: true, aiVerified: true, aiResult: true } } } }),
        prisma.otherExpense.count({ where: projectWhere }),
      ]);
      if (type === "other") { results = items; total = count; }
      else results.push(...items.map(i => ({ ...i, _type: "other" })));
    }

    if (!type) {
      results.sort((a, b) => {
        const aDate = new Date(a.usageDate || a.chargeDate || a.expenseDate).getTime();
        const bDate = new Date(b.usageDate || b.chargeDate || b.expenseDate).getTime();
        return bDate - aDate;
      });
      total = results.length;
    }

    return NextResponse.json({
      expenses: results,
      pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const fd = await req.formData();
    const type = fd.get("type") as string;
    const projectId = fd.get("projectId") as string;
    const name = fd.get("name") as string;
    const category = (fd.get("category") as string) || "OTHER";
    const amount = parseFloat(fd.get("amount") as string);
    const paymentMethod = (fd.get("paymentMethod") as string) || "CASH";
    const date = fd.get("date") as string;
    const description = (fd.get("description") as string) || "";
    const receiptFile = fd.get("receipt") as File | null;

    if (!projectId) return NextResponse.json({ error: "Project is required" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!amount || amount <= 0) return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });

    if (session.user.role === "SITE_MANAGER") {
      const assignment = await prisma.projectAssignment.findFirst({
        where: { projectId, userId: session.user.id, isActive: true },
      });
      if (!assignment) return NextResponse.json({ error: "You are not assigned to this project" }, { status: 403 });
    }

    // Get project name for AI context
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });

    let receiptId: string | undefined;
    let aiVerification = null;

    if (receiptFile && receiptFile.size > 0) {
      try {
        const saved = await saveReceiptWithAI(receiptFile, {
          projectId,
          recordedById: session.user.id,
          expenseName: name,
          expenseAmount: amount,
          expenseType: type || "expense",
          projectName: project?.name,
          purchasedBy: session.user.name,
        });
        receiptId = saved.receiptId;
        aiVerification = saved.aiVerification;
      } catch (e: any) {
        console.warn("Receipt save failed:", e.message);
      }
    }

    let record: any;
    if (type === "utility") {
      record = await prisma.utility.create({
        data: { projectId, name, category, amount, paymentMethod: paymentMethod as any, usageDate: new Date(date), description, receiptId },
      });
    } else if (type === "charge") {
      record = await prisma.siteCharge.create({
        data: { projectId, name, category, amount, paymentMethod: paymentMethod as any, chargeDate: new Date(date), description, receiptId },
      });
    } else {
      record = await prisma.otherExpense.create({
        data: { projectId, name, category: category || "MISCELLANEOUS", amount, paymentMethod: paymentMethod as any, expenseDate: new Date(date), description, receiptId },
      });
    }

    await createAuditLog({
      userId: session.user.id, projectId, action: "CREATE",
      resource: type === "utility" ? "Utility" : type === "charge" ? "SiteCharge" : "OtherExpense",
      resourceId: record.id, details: { name, amount, type },
    });

    return NextResponse.json({ record, aiVerification }, { status: 201 });
  } catch (err) { return handleApiError(err); }
}
