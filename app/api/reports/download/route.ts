export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";
import { format } from "date-fns";
import { getPeriodDates } from "@/lib/dates";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const fmt      = url.searchParams.get("format") || "pdf";
    const projectId = url.searchParams.get("projectId") || "";
    const period   = url.searchParams.get("period") || "month";
    const { start, end } = getPeriodDates(
      period,
      url.searchParams.get("startDate") || "",
      url.searchParams.get("endDate") || ""
    );

    // Build project filter
    const projectWhere: Record<string, any> = {};
    if (projectId) projectWhere.id = projectId;
    if (session.user.role === "SITE_MANAGER") {
      const assignments = await prisma.projectAssignment.findMany({
        where: { userId: session.user.id, isActive: true },
        select: { projectId: true },
      });
      projectWhere.id = { in: assignments.map((a) => a.projectId) };
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true, name: true, location: true,
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: { user: { select: { name: true } } },
        },
      },
    });
    const ids = projects.map((p) => p.id);
    const dateWhere = { gte: start, lte: end };
    const before = { lt: start };

    const [received, purchases, utilities, charges, otherExpenses, officeExpenses, recvBefore, purchBefore, utilBefore, chargeBefore, otherBefore, officeBefore] = await Promise.all([
      prisma.moneyReceived.findMany({
        where: { projectId: { in: ids }, receivedDate: dateWhere },
        include: { project: { select: { name: true } } },
        orderBy: { receivedDate: "desc" },
      }),
      prisma.purchase.findMany({
        where: { projectId: { in: ids }, purchaseDate: dateWhere },
        include: {
          project: { select: { name: true } },
          items: { include: { item: { select: { name: true } } } },
          installments: { orderBy: { paymentDate: "asc" } },
        },
        orderBy: { purchaseDate: "desc" },
      }),
      prisma.utility.findMany({
        where: { projectId: { in: ids }, usageDate: dateWhere },
        include: { project: { select: { name: true } } },
      }),
      prisma.siteCharge.findMany({
        where: { projectId: { in: ids }, chargeDate: dateWhere },
        include: { project: { select: { name: true } } },
      }),
      prisma.otherExpense.findMany({
        where: { projectId: { in: ids }, expenseDate: dateWhere },
        include: { project: { select: { name: true } } },
      }),
      prisma.officeExpense.findMany({ where: { expenseDate: dateWhere } }),
      prisma.moneyReceived.aggregate({ where: { projectId: { in: ids }, receivedDate: before }, _sum: { amount: true } }),
      prisma.purchase.aggregate({ where: { projectId: { in: ids }, purchaseDate: before }, _sum: { totalAmount: true } }),
      prisma.utility.aggregate({ where: { projectId: { in: ids }, usageDate: before }, _sum: { amount: true } }),
      prisma.siteCharge.aggregate({ where: { projectId: { in: ids }, chargeDate: before }, _sum: { amount: true } }),
      prisma.otherExpense.aggregate({ where: { projectId: { in: ids }, expenseDate: before }, _sum: { amount: true } }),
      prisma.officeExpense.aggregate({ where: { expenseDate: before }, _sum: { amount: true } }),
    ]);

    const totalReceived = received.reduce((s, r) => s + r.amount, 0);
    const totalSpent =
      purchases.reduce((s, p) => s + p.totalAmount, 0) +
      utilities.reduce((s, u) => s + u.amount, 0) +
      charges.reduce((s, c) => s + c.amount, 0) +
      otherExpenses.reduce((s, o) => s + o.amount, 0) +
      officeExpenses.reduce((s, o) => s + o.amount, 0);
    const bbf = (recvBefore._sum.amount || 0) - ((purchBefore._sum.totalAmount || 0) + (utilBefore._sum.amount || 0) + (chargeBefore._sum.amount || 0) + (otherBefore._sum.amount || 0) + (officeBefore._sum.amount || 0));
    const balance = bbf + totalReceived - totalSpent;
    const company = await prisma.companySettings.findFirst();
    const reportCtx = {
      company, received, purchases, utilities, charges, otherExpenses, officeExpenses, projects,
      totalReceived, totalSpent, bbf, balance, period: { start, end }, generatedBy: session.user.name as string,
    };

    // ── PDF (HTML) ───────────────────────────────────────────────
    if (fmt === "pdf") {
      const html = buildHtml(reportCtx);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="BuildSpark-Report-${format(new Date(), "yyyy-MM-dd")}.html"`,
        },
      });
    }

    // ── Excel ────────────────────────────────────────────────────
    if (fmt === "excel") {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.default.Workbook();
      wb.creator = "BuildSpark";

      const ws = wb.addWorksheet("Financial Report");
      ws.columns = [{ width: 18 }, { width: 28 }, { width: 28 }, { width: 18 }, { width: 18 }, { width: 18 }];

      const title = ws.addRow(["BuildSpark Financial Report"]);
      title.getCell(1).font = { bold: true, size: 14, color: { argb: "FFf97316" } };
      ws.addRow([company?.companyName || "Spark Construction Limited"]);
      ws.addRow([`Period: ${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`]);
      ws.addRow([`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")} by ${session.user.name}`]);
      ws.addRow([]);

      // Summary
      const sumHdr = ws.addRow(["SUMMARY"]);
      sumHdr.getCell(1).font = { bold: true };
      ws.addRow(["Balance Brought Forward (UGX)", bbf]);
      ws.addRow(["Total Received (UGX)", totalReceived]);
      ws.addRow(["Total Spent (UGX)", totalSpent]);
      ws.addRow(["Closing Balance (UGX)", balance]);
      ws.addRow([]);

      // Money Received
      const mrHdr = ws.addRow(["MONEY RECEIVED"]);
      mrHdr.getCell(1).font = { bold: true };
      const mrCols = ws.addRow(["Date", "Project", "Source", "Method", "Amount (UGX)", "Reference"]);
      mrCols.eachCell(c => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFf1f5f9" } }; });
      received.forEach(r => ws.addRow([
        format(new Date(r.receivedDate), "dd/MM/yyyy"),
        r.project.name, r.source, r.paymentMethod,
        r.amount, r.reference || "",
      ]));
      ws.addRow([]);

      // Purchases
      const pHdr = ws.addRow(["PURCHASES"]);
      pHdr.getCell(1).font = { bold: true };
      const pCols = ws.addRow(["Date", "Project", "Items", "Total (UGX)", "Paid (UGX)", "Due (UGX)"]);
      pCols.eachCell(c => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFf1f5f9" } }; });
      purchases.forEach(p => ws.addRow([
        format(new Date(p.purchaseDate), "dd/MM/yyyy"),
        p.project.name,
        p.items.map((i: any) => i.item?.name || "").join(", "),
        p.totalAmount, p.amountPaid, p.amountDue,
      ]));

      const buffer = await wb.xlsx.writeBuffer();
      return new NextResponse(buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="BuildSpark-Report-${format(new Date(), "yyyy-MM-dd")}.xlsx"`,
        },
      });
    }

    // ── Word (HTML-based .doc) ────────────────────────────────────
    if (fmt === "word") {
      const doc = buildWordDoc(reportCtx);
      return new NextResponse(doc, {
        headers: {
          "Content-Type": "application/msword",
          "Content-Disposition": `attachment; filename="BuildSpark-Report-${format(new Date(), "yyyy-MM-dd")}.doc"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format. Use: pdf, excel, word" }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}

// ── HTML report builder ──────────────────────────────────────────────────────
function buildHtml(ctx: any) {
  const { company, received, purchases, utilities, charges, otherExpenses, officeExpenses, projects, totalReceived, totalSpent, bbf, balance, period, generatedBy } = ctx;

  const receivedRows = received.map((r: any) =>
    `<tr><td>${format(new Date(r.receivedDate), "dd/MM/yyyy")}</td><td>${r.project.name}</td><td>${r.source}</td><td>${r.paymentMethod}</td><td><strong>${r.amount.toLocaleString()}</strong></td><td>${r.reference || "—"}</td></tr>`
  ).join("") || `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">No records for this period</td></tr>`;

  const purchaseRows = purchases.map((p: any) =>
    `<tr><td>${format(new Date(p.purchaseDate), "dd/MM/yyyy")}</td><td>${p.project.name}</td><td>${p.items.map((i: any) => i.item?.name || "").join(", ")}</td><td><strong>${p.totalAmount.toLocaleString()}</strong></td><td style="color:#16a34a">${p.amountPaid.toLocaleString()}</td><td style="color:${p.amountDue > 0 ? "#dc2626" : "#16a34a"}">${p.amountDue.toLocaleString()}</td></tr>`
  ).join("") || `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">No purchases for this period</td></tr>`;

  const utilRows = utilities.length > 0
    ? utilities.map((u: any) => `<tr><td>${format(new Date(u.usageDate), "dd/MM/yyyy")}</td><td>${u.project.name}</td><td>${u.name}</td><td>${u.category}</td><td>${u.amount.toLocaleString()}</td></tr>`).join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>BuildSpark Financial Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:40px;background:#fff}
.header{background:linear-gradient(135deg,#f97316,#c2410c);color:white;padding:30px;border-radius:16px;margin-bottom:30px}
.header h1{font-size:26px;font-weight:800}
.header p{opacity:.85;margin-top:4px;font-size:14px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px}
.card h3{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.card .amount{font-size:22px;font-weight:800}
.green{color:#16a34a}.red{color:#dc2626}.blue{color:#2563eb}
table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px}
th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9}
.section-title{font-size:15px;font-weight:700;margin:24px 0 12px;color:#0f172a;border-left:4px solid #f97316;padding-left:12px}
.footer{margin-top:40px;padding-top:16px;border-top:2px solid #f1f5f9;text-align:center;color:#94a3b8;font-size:12px}
@media print{body{padding:20px}}
</style>
</head>
<body>
<div class="header">
  <h1>📊 Financial Report</h1>
  <p>${company?.companyName || "Spark Construction Limited"} | BuildSpark</p>
  <p>Period: ${format(period.start, "dd MMM yyyy")} – ${format(period.end, "dd MMM yyyy")}</p>
  <p>Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")} by ${generatedBy}</p>
</div>
<div class="grid2">
  <div class="card"><h3>Total Received</h3><div class="amount green">UGX ${totalReceived.toLocaleString()}</div></div>
  <div class="card"><h3>Total Spent</h3><div class="amount red">UGX ${totalSpent.toLocaleString()}</div></div>
  <div class="card"><h3>Net Balance</h3><div class="amount ${balance >= 0 ? "blue" : "red"}">${balance < 0 ? "-" : ""}UGX ${Math.abs(balance).toLocaleString()}</div></div>
  <div class="card"><h3>Purchases</h3><div class="amount">${purchases.length}</div></div>
</div>
<div class="section-title">💵 Money Received (${received.length})</div>
<table><thead><tr><th>Date</th><th>Project</th><th>Source</th><th>Method</th><th>Amount (UGX)</th><th>Reference</th></tr></thead><tbody>${receivedRows}</tbody></table>
<div class="section-title">🛒 Purchases (${purchases.length})</div>
<table><thead><tr><th>Date</th><th>Project</th><th>Items</th><th>Total (UGX)</th><th>Paid (UGX)</th><th>Due (UGX)</th></tr></thead><tbody>${purchaseRows}</tbody></table>
${utilRows ? `<div class="section-title">⚡ Utilities (${utilities.length})</div><table><thead><tr><th>Date</th><th>Project</th><th>Name</th><th>Category</th><th>Amount (UGX)</th></tr></thead><tbody>${utilRows}</tbody></table>` : ""}
<div class="footer">
  <p>🏗️ Generated by <strong>BuildSpark</strong> – Spark Construction Limited</p>
  <p>Confidential. For authorised personnel only.</p>
</div>
<script>window.onload=()=>window.print();</script>
</body>
</html>`;
}

// ── Word doc builder ──────────────────────────────────────────────────────────
function buildWordDoc(ctx: {
  company: any;
  received: any[];
  purchases: any[];
  totalReceived: number;
  totalSpent: number;
  balance: number;
  period: { start: Date; end: Date };
  generatedBy: string;
}) {
  const { company, received, purchases, totalReceived, totalSpent, balance, period, generatedBy } = ctx;
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset='UTF-8'><title>BuildSpark Report</title>
<style>body{font-family:Arial,sans-serif;margin:40px}h1{color:#f97316}h2{color:#1e293b;border-bottom:2px solid #f97316;padding-bottom:4px;margin-top:20px}table{border-collapse:collapse;width:100%}th{background:#f1f5f9;padding:8px;text-align:left;border:1px solid #e2e8f0}td{padding:8px;border:1px solid #e2e8f0}</style>
</head>
<body>
<h1>BuildSpark Financial Report</h1>
<p><strong>${company?.companyName || "Spark Construction Limited"}</strong></p>
<p>Period: ${format(period.start, "dd MMM yyyy")} – ${format(period.end, "dd MMM yyyy")}</p>
<p>Generated by: ${generatedBy} on ${format(new Date(), "dd MMM yyyy, HH:mm")}</p>
<hr/>
<h2>Summary</h2>
<table><tr><th>Metric</th><th>Amount (UGX)</th></tr>
<tr><td>Total Received</td><td>${totalReceived.toLocaleString()}</td></tr>
<tr><td>Total Spent</td><td>${totalSpent.toLocaleString()}</td></tr>
<tr><td>Net Balance</td><td>${balance.toLocaleString()}</td></tr>
</table>
<h2>Money Received</h2>
<table><tr><th>Date</th><th>Project</th><th>Source</th><th>Amount (UGX)</th></tr>
${received.map((r: any) => `<tr><td>${format(new Date(r.receivedDate), "dd/MM/yyyy")}</td><td>${r.project.name}</td><td>${r.source}</td><td>${r.amount.toLocaleString()}</td></tr>`).join("")}
</table>
<h2>Purchases</h2>
<table><tr><th>Date</th><th>Project</th><th>Total (UGX)</th><th>Paid (UGX)</th><th>Due (UGX)</th></tr>
${purchases.map((p: any) => `<tr><td>${format(new Date(p.purchaseDate), "dd/MM/yyyy")}</td><td>${p.project.name}</td><td>${p.totalAmount.toLocaleString()}</td><td>${p.amountPaid.toLocaleString()}</td><td>${p.amountDue.toLocaleString()}</td></tr>`).join("")}
</table>
<p style="margin-top:40px;color:#94a3b8;font-size:12px"><em>Generated by BuildSpark – Spark Construction Limited. Confidential.</em></p>
</body></html>`;
}
