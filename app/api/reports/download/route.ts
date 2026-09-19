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
    const fmt       = url.searchParams.get("format") || "pdf";
    const projectId = url.searchParams.get("projectId") || "";
    const period    = url.searchParams.get("period") || "month";
    const reportType = url.searchParams.get("type") || "standard"; // standard | comprehensive | daily
    const { start, end } = getPeriodDates(
      period,
      url.searchParams.get("startDate") || "",
      url.searchParams.get("endDate") || ""
    );

    // Scope projects
    const projectWhere: Record<string, any> = {};
    if (projectId) projectWhere.id = projectId;
    if (session.user.role === "SITE_MANAGER") {
      const asgn = await prisma.projectAssignment.findMany({
        where: { userId: session.user.id, isActive: true },
        select: { projectId: true },
      });
      projectWhere.id = { in: asgn.map((a) => a.projectId) };
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, location: true,
        assignments: { orderBy: { assignedAt: "desc" }, include: { user: { select: { name: true } } } },
      },
    });
    const ids = projects.map((p) => p.id);
    const dateWhere = { gte: start, lte: end };
    const before = { lt: start };

    const [received, purchases, utilities, charges, otherExpenses, officeExpenses,
      recvBefore, purchBefore, utilBefore, chargeBefore, otherBefore, officeBefore] = await Promise.all([
      prisma.moneyReceived.findMany({
        where: { projectId: { in: ids }, receivedDate: dateWhere },
        include: { project: { select: { name: true } }, receivedBy: { select: { name: true } } },
        orderBy: { receivedDate: "desc" },
      }),
      prisma.purchase.findMany({
        where: { projectId: { in: ids }, purchaseDate: dateWhere },
        include: {
          project: { select: { name: true } },
          purchasedBy: { select: { name: true } },
          items: { include: { item: { select: { name: true, unit: true } } } },
          installments: { orderBy: { paymentDate: "asc" } },
        },
        orderBy: { purchaseDate: "desc" },
      }),
      prisma.utility.findMany({ where: { projectId: { in: ids }, usageDate: dateWhere }, include: { project: { select: { name: true } } } }),
      prisma.siteCharge.findMany({ where: { projectId: { in: ids }, chargeDate: dateWhere }, include: { project: { select: { name: true } } } }),
      prisma.otherExpense.findMany({ where: { projectId: { in: ids }, expenseDate: dateWhere }, include: { project: { select: { name: true } } } }),
      prisma.officeExpense.findMany({ where: { expenseDate: dateWhere }, include: { user: { select: { name: true } } } }),
      prisma.moneyReceived.aggregate({ where: { projectId: { in: ids }, receivedDate: before }, _sum: { amount: true } }),
      prisma.purchase.aggregate({ where: { projectId: { in: ids }, purchaseDate: before }, _sum: { totalAmount: true } }),
      prisma.utility.aggregate({ where: { projectId: { in: ids }, usageDate: before }, _sum: { amount: true } }),
      prisma.siteCharge.aggregate({ where: { projectId: { in: ids }, chargeDate: before }, _sum: { amount: true } }),
      prisma.otherExpense.aggregate({ where: { projectId: { in: ids }, expenseDate: before }, _sum: { amount: true } }),
      prisma.officeExpense.aggregate({ where: { expenseDate: before }, _sum: { amount: true } }),
    ]);

    // Inventory usage for daily reports
    let usageRecords: any[] = [];
    if (reportType === "daily") {
      usageRecords = await prisma.inventoryUsage.findMany({
        where: { projectId: { in: ids }, usedDate: dateWhere },
        include: { item: { select: { name: true, unit: true } }, recordedBy: { select: { name: true } } },
        orderBy: { usedDate: "desc" },
      });
    }

    const totalReceived = received.reduce((s, r) => s + r.amount, 0);
    const totalPurchases = purchases.reduce((s, p) => s + p.totalAmount, 0);
    const totalUtilities = utilities.reduce((s, u) => s + u.amount, 0);
    const totalCharges = charges.reduce((s, c) => s + c.amount, 0);
    const totalOther = otherExpenses.reduce((s, o) => s + o.amount, 0);
    const totalOffice = officeExpenses.reduce((s, o) => s + o.amount, 0);
    const totalSpent = totalPurchases + totalUtilities + totalCharges + totalOther + totalOffice;
    const bbf = (recvBefore._sum.amount || 0) - ((purchBefore._sum.totalAmount || 0) + (utilBefore._sum.amount || 0) + (chargeBefore._sum.amount || 0) + (otherBefore._sum.amount || 0) + (officeBefore._sum.amount || 0));
    const balance = bbf + totalReceived - totalSpent;

    const company = await prisma.companySettings.findFirst();
    const ctx = {
      company, received, purchases, utilities, charges, otherExpenses, officeExpenses,
      usageRecords, projects, totalReceived, totalPurchases, totalUtilities, totalCharges,
      totalOther, totalOffice, totalSpent, bbf, balance,
      period: { start, end }, generatedBy: session.user.name as string, reportType,
    };

    const dateStr = format(new Date(), "yyyy-MM-dd");

    // ── PDF / HTML ───────────────────────────────────────────────
    if (fmt === "pdf") {
      const html = buildHtml(ctx);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="BuildSpark-Report-${dateStr}.html"`,
        },
      });
    }

    // ── Excel ────────────────────────────────────────────────────
    if (fmt === "excel") {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.default.Workbook();
      wb.creator = "BuildSpark";
      wb.created = new Date();
      const addSheetHeader = (ws: any, title: string) => {
        ws.columns = [{ width: 16 }, { width: 30 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
        const h = ws.addRow([title]);
        h.getCell(1).font = { bold: true, size: 13, color: { argb: "FFf97316" } };
        ws.addRow([company?.companyName || "Spark Construction Limited"]);
        ws.addRow([`Period: ${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`]);
        ws.addRow([`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")} by ${session.user.name}`]);
        ws.addRow([]);
      };

      // Summary sheet
      const ws = wb.addWorksheet("Summary");
      addSheetHeader(ws, "BuildSpark Report – Summary");
      const rows = [
        ["Balance Brought Forward (UGX)", bbf],
        ["Total Money Received (UGX)", totalReceived],
        ["", ""],
        ["Purchases (UGX)", totalPurchases],
        ["Utilities (UGX)", totalUtilities],
        ["Site Charges (UGX)", totalCharges],
        ["Other Expenses (UGX)", totalOther],
        ["Office Expenses (UGX)", totalOffice],
        ["Total Spent (UGX)", totalSpent],
        ["", ""],
        ["Closing Balance (UGX)", balance],
      ];
      rows.forEach(([label, value]) => {
        const r = ws.addRow([label, value]);
        if (label === "Closing Balance (UGX)" || label === "Balance Brought Forward (UGX)") {
          r.eachCell(c => { c.font = { bold: true }; });
        }
      });

      // Money Received
      const wsR = wb.addWorksheet("Money Received");
      addSheetHeader(wsR, "Money Received");
      const rHdr = wsR.addRow(["Date", "Project", "Source", "Payment Method", "Received By", "Reference", "Amount (UGX)"]);
      rHdr.eachCell(c => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFe2f0e8" } }; });
      received.forEach((r: any) => wsR.addRow([
        format(new Date(r.receivedDate), "dd/MM/yyyy"), r.project?.name, r.source,
        r.paymentMethod?.replace(/_/g, " "), r.receivedBy?.name, r.reference || "", r.amount,
      ]));
      wsR.addRow(["", "", "", "", "", "TOTAL", received.reduce((s: number, r: any) => s + r.amount, 0)]);

      // Purchases
      const wsP = wb.addWorksheet("Purchases");
      addSheetHeader(wsP, "Purchases");
      const pH = wsP.addRow(["Date", "Project", "Items", "Total (UGX)", "Paid (UGX)", "Due (UGX)", "Purchased By"]);
      pH.eachCell(c => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFfef3e2" } }; });
      purchases.forEach((p: any) => {
        wsP.addRow([
          format(new Date(p.purchaseDate), "dd/MM/yyyy"), p.project?.name,
          p.items.map((i: any) => `${i.item?.name} (${i.quantity})`).join(", "),
          p.totalAmount, p.amountPaid, p.amountDue, p.purchasedBy?.name,
        ]);
        // Installments as sub-rows
        if (p.installments?.length > 1) {
          p.installments.forEach((inst: any) => {
            const r2 = wsP.addRow(["  └ Payment", "", format(new Date(inst.paymentDate), "dd/MM/yyyy"), "", inst.amount, "", inst.paymentMethod?.replace(/_/g, " ")]);
            r2.getCell(1).font = { italic: true, color: { argb: "FF64748b" } };
          });
        }
      });

      // Utilities
      if (utilities.length > 0) {
        const wsU = wb.addWorksheet("Utilities");
        addSheetHeader(wsU, "Utilities");
        const uH = wsU.addRow(["Date", "Project", "Name", "Category", "Payment Method", "Amount (UGX)"]);
        uH.eachCell(c => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFfefce8" } }; });
        utilities.forEach((u: any) => wsU.addRow([format(new Date(u.usageDate), "dd/MM/yyyy"), u.project?.name, u.name, u.category, u.paymentMethod?.replace(/_/g, " "), u.amount]));
      }

      // Site Charges
      if (charges.length > 0) {
        const wsC = wb.addWorksheet("Site Charges");
        addSheetHeader(wsC, "Site Charges");
        const cH = wsC.addRow(["Date", "Project", "Name", "Category", "Payment Method", "Amount (UGX)"]);
        cH.eachCell(c => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFf5f3ff" } }; });
        charges.forEach((c: any) => wsC.addRow([format(new Date(c.chargeDate), "dd/MM/yyyy"), c.project?.name, c.name, c.category, c.paymentMethod?.replace(/_/g, " "), c.amount]));
      }

      // Other Expenses
      if (otherExpenses.length > 0) {
        const wsO = wb.addWorksheet("Other Expenses");
        addSheetHeader(wsO, "Other Expenses");
        const oH = wsO.addRow(["Date", "Project", "Name", "Category", "Payment Method", "Amount (UGX)"]);
        oH.eachCell(c => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFfdf2f8" } }; });
        otherExpenses.forEach((o: any) => wsO.addRow([format(new Date(o.expenseDate), "dd/MM/yyyy"), o.project?.name, o.name, o.category, o.paymentMethod?.replace(/_/g, " "), o.amount]));
      }

      // Office Expenses
      if (officeExpenses.length > 0) {
        const wsOff = wb.addWorksheet("Office Expenses");
        addSheetHeader(wsOff, "Office Expenses");
        const offH = wsOff.addRow(["Date", "By", "Name", "Category", "Payment Method", "Amount (UGX)"]);
        offH.eachCell(c => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFecfeff" } }; });
        officeExpenses.forEach((o: any) => wsOff.addRow([format(new Date(o.expenseDate), "dd/MM/yyyy"), o.user?.name, o.name, o.category, o.paymentMethod?.replace(/_/g, " "), o.amount]));
      }

      // Inventory Usage (daily)
      if (usageRecords.length > 0) {
        const wsI = wb.addWorksheet("Inventory Usage");
        addSheetHeader(wsI, "Inventory Usage");
        const iH = wsI.addRow(["Date", "Item", "Unit", "Type", "Quantity", "Recorded By", "Notes"]);
        iH.eachCell(c => { c.font = { bold: true }; });
        usageRecords.forEach((u: any) => wsI.addRow([
          format(new Date(u.usedDate), "dd/MM/yyyy"), u.item?.name, u.item?.unit,
          u.type, u.quantity, u.recordedBy?.name, u.description || "",
        ]));
      }

      const buffer = await wb.xlsx.writeBuffer();
      return new NextResponse(buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="BuildSpark-Report-${dateStr}.xlsx"`,
        },
      });
    }

    // ── Word (.doc HTML) ──────────────────────────────────────────
    if (fmt === "word") {
      const doc = buildWordDoc(ctx);
      return new NextResponse(doc, {
        headers: {
          "Content-Type": "application/msword",
          "Content-Disposition": `attachment; filename="BuildSpark-Report-${dateStr}.doc"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format. Use: pdf, excel, word" }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}

// ── HTML/PDF builder ─────────────────────────────────────────────────────────
function buildHtml(ctx: any) {
  const { company, received, purchases, utilities, charges, otherExpenses, officeExpenses,
    usageRecords, totalReceived, totalPurchases, totalUtilities, totalCharges, totalOther,
    totalOffice, totalSpent, bbf, balance, period, generatedBy, reportType } = ctx;

  const C = (n: number) => `UGX ${n.toLocaleString()}`;
  const D = (d: any) => format(new Date(d), "dd/MM/yyyy");

  const receivedRows = received.map((r: any) =>
    `<tr><td>${D(r.receivedDate)}</td><td>${r.project?.name}</td><td>${r.source}</td><td>${r.paymentMethod?.replace(/_/g," ")}</td><td>${r.receivedBy?.name||"—"}</td><td>${r.reference||"—"}</td><td class="amt green"><b>${C(r.amount)}</b></td></tr>`
  ).join("") || `<tr><td colspan="7" class="empty">No money received this period</td></tr>`;

  const purchaseRows = purchases.map((p: any) => {
    const itemList = p.items.map((i: any) => `${i.item?.name} ×${i.quantity}`).join(", ");
    const instRows = (p.installments || []).length > 1
      ? p.installments.map((inst: any) =>
          `<tr style="background:#f0fdf4"><td colspan="2" style="padding-left:32px;color:#64748b;font-style:italic">↳ Payment: ${D(inst.paymentDate)} via ${inst.paymentMethod?.replace(/_/g," ")}</td><td colspan="3"></td><td class="amt green">${C(inst.amount)}</td><td></td></tr>`
        ).join("")
      : "";
    return `<tr>
      <td>${D(p.purchaseDate)}</td><td>${p.project?.name}</td><td>${itemList}</td>
      <td class="amt"><b>${C(p.totalAmount)}</b></td>
      <td class="amt green">${C(p.amountPaid)}</td>
      <td class="amt ${p.amountDue>0?"red":"green"}">${C(p.amountDue)}</td>
      <td>${p.purchasedBy?.name||"—"}</td>
    </tr>${instRows}`;
  }).join("") || `<tr><td colspan="7" class="empty">No purchases this period</td></tr>`;

  const utilRows = utilities.map((u: any) =>
    `<tr><td>${D(u.usageDate)}</td><td>${u.project?.name}</td><td>${u.name}</td><td>${u.category}</td><td class="amt red">${C(u.amount)}</td></tr>`
  ).join("");
  const chargeRows = charges.map((c: any) =>
    `<tr><td>${D(c.chargeDate)}</td><td>${c.project?.name}</td><td>${c.name}</td><td>${c.category}</td><td class="amt red">${C(c.amount)}</td></tr>`
  ).join("");
  const otherRows = otherExpenses.map((o: any) =>
    `<tr><td>${D(o.expenseDate)}</td><td>${o.project?.name}</td><td>${o.name}</td><td>${o.category}</td><td class="amt red">${C(o.amount)}</td></tr>`
  ).join("");
  const officeRows = officeExpenses.map((o: any) =>
    `<tr><td>${D(o.expenseDate)}</td><td>${o.user?.name}</td><td>${o.name}</td><td>${o.category}</td><td class="amt red">${C(o.amount)}</td></tr>`
  ).join("");
  const usageRows = usageRecords.map((u: any) =>
    `<tr><td>${D(u.usedDate)}</td><td>${u.item?.name}</td><td>${u.item?.unit}</td>
     <td><span class="${u.type==="USE"?"badge-red":"badge-green"}">${u.type}</span></td>
     <td class="amt ${u.type==="USE"?"red":"green"}">${u.type==="USE"?"-":"+"}${u.quantity}</td>
     <td>${u.recordedBy?.name||"—"}</td><td>${u.description||"—"}</td></tr>`
  ).join("");

  const title = reportType === "daily"
    ? `Daily Report — ${format(period.start, "EEEE dd MMM yyyy")}`
    : reportType === "comprehensive"
    ? "Comprehensive Financial Report"
    : "Financial Report";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:32px;background:#fff;font-size:13px}
.header{background:linear-gradient(135deg,#f97316,#c2410c);color:white;padding:24px 30px;border-radius:12px;margin-bottom:24px}
.header h1{font-size:22px;font-weight:800;margin-bottom:4px}
.header p{opacity:.85;font-size:13px;margin-top:2px}
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
.card h3{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.card .val{font-size:18px;font-weight:800}
.green{color:#16a34a}.red{color:#dc2626}.blue{color:#2563eb}.slate{color:#475569}
.section{margin-bottom:28px}
.section h2{font-size:13px;font-weight:700;color:#0f172a;border-left:3px solid #f97316;padding-left:10px;margin-bottom:10px;text-transform:uppercase;letter-spacing:.3px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#f1f5f9;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600}
td{padding:8px 10px;border-bottom:1px solid #f1f5f9}
.amt{text-align:right;font-variant-numeric:tabular-nums}
.empty{text-align:center;color:#94a3b8;padding:16px;font-style:italic}
.badge-red{background:#fee2e2;color:#dc2626;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600}
.badge-green{background:#dcfce7;color:#16a34a;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600}
.closing{background:linear-gradient(135deg,#f97316,#c2410c);color:white;border-radius:12px;padding:20px;text-align:center;margin-top:24px}
.closing h2{font-size:14px;opacity:.85;margin-bottom:8px}
.closing .big{font-size:32px;font-weight:900}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px}
@media print{body{padding:16px}.closing{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head>
<body>
<div class="header">
  <h1>📊 ${title}</h1>
  <p>${company?.companyName||"Spark Construction Limited"} · BuildSpark</p>
  <p>Period: ${format(period.start,"dd MMM yyyy")} – ${format(period.end,"dd MMM yyyy")}</p>
  <p>Generated: ${format(new Date(),"dd MMM yyyy, HH:mm")} by ${generatedBy}</p>
</div>
<div class="summary">
  <div class="card"><h3>Balance B/F</h3><div class="val slate">${C(bbf)}</div></div>
  <div class="card"><h3>Total Received</h3><div class="val green">${C(totalReceived)}</div></div>
  <div class="card"><h3>Total Spent</h3><div class="val red">${C(totalSpent)}</div></div>
  <div class="card"><h3>Net Balance</h3><div class="val ${balance>=0?"blue":"red"}">${balance<0?"-":""}${C(Math.abs(balance))}</div></div>
</div>
<div class="section">
  <h2>💵 Money Received (${received.length})</h2>
  <table><thead><tr><th>Date</th><th>Project</th><th>Source</th><th>Method</th><th>Received By</th><th>Reference</th><th class="amt">Amount (UGX)</th></tr></thead>
  <tbody>${receivedRows}</tbody>
  <tfoot><tr><td colspan="6"><b>Total</b></td><td class="amt green"><b>${C(totalReceived)}</b></td></tr></tfoot>
  </table>
</div>
<div class="section">
  <h2>🛒 Purchases (${purchases.length})</h2>
  <table><thead><tr><th>Date</th><th>Project</th><th>Items</th><th class="amt">Total</th><th class="amt">Paid</th><th class="amt">Due</th><th>By</th></tr></thead>
  <tbody>${purchaseRows}</tbody>
  <tfoot><tr><td colspan="3"><b>Total</b></td><td class="amt"><b>${C(totalPurchases)}</b></td><td colspan="3"></td></tr></tfoot>
  </table>
</div>
${utilities.length>0?`<div class="section"><h2>⚡ Utilities (${utilities.length})</h2><table><thead><tr><th>Date</th><th>Project</th><th>Name</th><th>Category</th><th class="amt">Amount (UGX)</th></tr></thead><tbody>${utilRows}</tbody><tfoot><tr><td colspan="4"><b>Total</b></td><td class="amt red"><b>${C(totalUtilities)}</b></td></tr></tfoot></table></div>`:""}
${charges.length>0?`<div class="section"><h2>🔧 Site Charges (${charges.length})</h2><table><thead><tr><th>Date</th><th>Project</th><th>Name</th><th>Category</th><th class="amt">Amount (UGX)</th></tr></thead><tbody>${chargeRows}</tbody><tfoot><tr><td colspan="4"><b>Total</b></td><td class="amt red"><b>${C(totalCharges)}</b></td></tr></tfoot></table></div>`:""}
${otherExpenses.length>0?`<div class="section"><h2>📋 Other Expenses (${otherExpenses.length})</h2><table><thead><tr><th>Date</th><th>Project</th><th>Name</th><th>Category</th><th class="amt">Amount (UGX)</th></tr></thead><tbody>${otherRows}</tbody><tfoot><tr><td colspan="4"><b>Total</b></td><td class="amt red"><b>${C(totalOther)}</b></td></tr></tfoot></table></div>`:""}
${officeExpenses.length>0?`<div class="section"><h2>🏢 Office Expenses (${officeExpenses.length})</h2><table><thead><tr><th>Date</th><th>By</th><th>Name</th><th>Category</th><th class="amt">Amount (UGX)</th></tr></thead><tbody>${officeRows}</tbody><tfoot><tr><td colspan="4"><b>Total</b></td><td class="amt red"><b>${C(totalOffice)}</b></td></tr></tfoot></table></div>`:""}
${usageRecords.length>0?`<div class="section"><h2>📦 Inventory Usage (${usageRecords.length})</h2><table><thead><tr><th>Date</th><th>Item</th><th>Unit</th><th>Type</th><th class="amt">Qty</th><th>Recorded By</th><th>Notes</th></tr></thead><tbody>${usageRows}</tbody></table></div>`:""}
<div class="closing">
  <h2>Closing Balance (${format(period.end,"dd MMM yyyy")})</h2>
  <div class="big">${balance<0?"-":""}${C(Math.abs(balance))}</div>
  <p style="opacity:.8;margin-top:8px;font-size:13px">${balance>=0?"Surplus — Income exceeds expenditure":"Deficit — Expenditure exceeds income"}</p>
</div>
<div class="footer">
  <p>🏗️ <strong>BuildSpark</strong> – ${company?.companyName||"Spark Construction Limited"} | Confidential</p>
</div>
<script>window.onload=()=>{if(document.readyState==="complete")window.print();};</script>
</body></html>`;
}

// ── Word doc builder ─────────────────────────────────────────────────────────
function buildWordDoc(ctx: any) {
  const { company, received, purchases, utilities, charges, otherExpenses, officeExpenses,
    totalReceived, totalSpent, bbf, balance, period, generatedBy } = ctx;
  const C = (n: number) => `UGX ${n.toLocaleString()}`;
  const D = (d: any) => format(new Date(d), "dd/MM/yyyy");

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset='UTF-8'><title>BuildSpark Report</title>
<style>
body{font-family:Arial,sans-serif;margin:40px;color:#1e293b}
h1{color:#f97316;font-size:22px}h2{color:#1e293b;border-bottom:2px solid #f97316;padding-bottom:4px;margin-top:20px;font-size:14px}
table{border-collapse:collapse;width:100%;margin-bottom:16px;font-size:12px}
th{background:#f1f5f9;padding:7px 10px;text-align:left;border:1px solid #e2e8f0;font-size:11px}
td{padding:7px 10px;border:1px solid #e2e8f0}
.green{color:#16a34a}.red{color:#dc2626}.blue{color:#2563eb}
tfoot td{font-weight:bold;background:#f8fafc}
</style></head>
<body>
<h1>BuildSpark – ${ctx.reportType==="daily"?"Daily":"Comprehensive"} Financial Report</h1>
<p><strong>${company?.companyName||"Spark Construction Limited"}</strong></p>
<p>Period: ${format(period.start,"dd MMM yyyy")} – ${format(period.end,"dd MMM yyyy")}</p>
<p>Generated by: ${generatedBy} on ${format(new Date(),"dd MMM yyyy, HH:mm")}</p>
<hr/>
<h2>Summary</h2>
<table>
<tr><th>Metric</th><th>Amount (UGX)</th></tr>
<tr><td>Balance Brought Forward</td><td>${C(bbf)}</td></tr>
<tr><td>Total Money Received</td><td class="green">${C(totalReceived)}</td></tr>
<tr><td>Total Spent</td><td class="red">${C(totalSpent)}</td></tr>
<tr><td><strong>Closing Balance</strong></td><td class="${balance>=0?"blue":"red"}"><strong>${C(balance)}</strong></td></tr>
</table>
<h2>Money Received</h2>
<table><tr><th>Date</th><th>Project</th><th>Source</th><th>Method</th><th>Amount (UGX)</th></tr>
${received.map((r: any) => `<tr><td>${D(r.receivedDate)}</td><td>${r.project?.name}</td><td>${r.source}</td><td>${r.paymentMethod?.replace(/_/g," ")}</td><td class="green">${C(r.amount)}</td></tr>`).join("")}
<tfoot><tr><td colspan="4"><b>Total</b></td><td class="green"><b>${C(totalReceived)}</b></td></tr></tfoot>
</table>
<h2>Purchases</h2>
<table><tr><th>Date</th><th>Project</th><th>Items</th><th>Total</th><th>Paid</th><th>Due</th></tr>
${purchases.map((p: any) => {
  const itemList = p.items.map((i: any) => `${i.item?.name} ×${i.quantity}`).join(", ");
  return `<tr><td>${D(p.purchaseDate)}</td><td>${p.project?.name}</td><td>${itemList}</td><td>${C(p.totalAmount)}</td><td class="green">${C(p.amountPaid)}</td><td class="${p.amountDue>0?"red":"green"}">${C(p.amountDue)}</td></tr>
${p.installments?.length>1?p.installments.map((i: any)=>`<tr style="color:#64748b"><td colspan="2" style="padding-left:24px;font-style:italic">↳ ${D(i.paymentDate)} ${i.paymentMethod?.replace(/_/g," ")}</td><td colspan="2"></td><td class="green">${C(i.amount)}</td><td></td></tr>`).join(""):""}`;
}).join("")}
<tfoot><tr><td colspan="3"><b>Total</b></td><td><b>${C(ctx.totalPurchases)}</b></td><td colspan="2"></td></tr></tfoot>
</table>
${utilities.length>0?`<h2>Utilities</h2><table><tr><th>Date</th><th>Project</th><th>Name</th><th>Category</th><th>Amount</th></tr>${utilities.map((u:any)=>`<tr><td>${D(u.usageDate)}</td><td>${u.project?.name}</td><td>${u.name}</td><td>${u.category}</td><td class="red">${C(u.amount)}</td></tr>`).join("")}</table>`:""}
${charges.length>0?`<h2>Site Charges</h2><table><tr><th>Date</th><th>Project</th><th>Name</th><th>Category</th><th>Amount</th></tr>${charges.map((c:any)=>`<tr><td>${D(c.chargeDate)}</td><td>${c.project?.name}</td><td>${c.name}</td><td>${c.category}</td><td class="red">${C(c.amount)}</td></tr>`).join("")}</table>`:""}
${otherExpenses.length>0?`<h2>Other Expenses</h2><table><tr><th>Date</th><th>Project</th><th>Name</th><th>Category</th><th>Amount</th></tr>${otherExpenses.map((o:any)=>`<tr><td>${D(o.expenseDate)}</td><td>${o.project?.name}</td><td>${o.name}</td><td>${o.category}</td><td class="red">${C(o.amount)}</td></tr>`).join("")}</table>`:""}
${officeExpenses.length>0?`<h2>Office Expenses</h2><table><tr><th>Date</th><th>By</th><th>Name</th><th>Category</th><th>Amount</th></tr>${officeExpenses.map((o:any)=>`<tr><td>${D(o.expenseDate)}</td><td>${o.user?.name}</td><td>${o.name}</td><td>${o.category}</td><td class="red">${C(o.amount)}</td></tr>`).join("")}</table>`:""}
<p style="margin-top:32px;color:#94a3b8;font-size:11px"><em>Generated by BuildSpark – ${company?.companyName||"Spark Construction Limited"}. Confidential.</em></p>
</body></html>`;
}
