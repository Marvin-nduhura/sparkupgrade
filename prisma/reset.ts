/**
 * BuildSpark — Data Reset Script
 * ================================
 * Deletes ALL transaction/demo data while keeping the 3 user accounts.
 *
 * Run locally:  npx tsx prisma/reset.ts
 * On Render:    Go to your web service → Shell tab → npx tsx prisma/reset.ts
 *
 * Users preserved:
 *   admin@sparkconst.co.ug     / Admin@2024!
 *   manager@sparkconst.co.ug   / Manager@2024!
 *   accounts@sparkconst.co.ug  / Account@2024!
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Starting data reset — users will be preserved...\n");

  // Delete in dependency order (children before parents)
  const steps: Array<{ label: string; fn: () => Promise<any> }> = [
    { label: "Audit logs",          fn: () => prisma.auditLog.deleteMany() },
    { label: "User notifications",  fn: () => prisma.userNotification.deleteMany() },
    { label: "Notifications",       fn: () => prisma.notification.deleteMany() },
    { label: "Inventory usage",     fn: () => prisma.inventoryUsage.deleteMany() },
    { label: "Daily reports",       fn: () => prisma.dailyReport.deleteMany() },
    { label: "Project images",      fn: () => prisma.projectImage.deleteMany() },
    { label: "Purchase items",      fn: () => prisma.purchaseItem.deleteMany() },
    { label: "Installments",        fn: () => prisma.installment.deleteMany() },
    { label: "Purchases",           fn: () => prisma.purchase.deleteMany() },
    { label: "Request items",       fn: () => prisma.requestItem.deleteMany() },
    { label: "Requests",            fn: () => prisma.request.deleteMany() },
    { label: "Money received",      fn: () => prisma.moneyReceived.deleteMany() },
    { label: "Money transfers",     fn: () => prisma.moneyTransfer.deleteMany() },
    { label: "Utilities",           fn: () => prisma.utility.deleteMany() },
    { label: "Site charges",        fn: () => prisma.siteCharge.deleteMany() },
    { label: "Other expenses",      fn: () => prisma.otherExpense.deleteMany() },
    { label: "Office expenses",     fn: () => prisma.officeExpense.deleteMany() },
    { label: "Office income",       fn: () => (prisma as any).officeIncome.deleteMany() },
    { label: "Project inventory",   fn: () => prisma.projectInventory.deleteMany() },
    { label: "Inventory items",     fn: () => prisma.inventoryItem.deleteMany() },
    { label: "Project assignments", fn: () => prisma.projectAssignment.deleteMany() },
    { label: "Projects",            fn: () => prisma.project.deleteMany() },
    { label: "Receipts",            fn: () => prisma.receipt.deleteMany() },
    { label: "Sessions",            fn: () => prisma.session.deleteMany() },
  ];

  for (const step of steps) {
    try {
      const result = await step.fn();
      const count = result?.count ?? "done";
      console.log(`  ✓ ${step.label}: ${count} deleted`);
    } catch (e: any) {
      // Table may not exist yet (e.g., officeIncome before migration) — skip gracefully
      if (e.code === "P2021" || e.message?.includes("does not exist")) {
        console.log(`  ⚠ ${step.label}: table not found, skipping`);
      } else {
        console.log(`  ✗ ${step.label}: ${e.message}`);
      }
    }
  }

  // Count surviving users
  const users = await prisma.user.findMany({
    select: { name: true, email: true, role: true },
  });

  console.log(`\n✅ Reset complete! ${users.length} user(s) preserved:\n`);
  users.forEach(u => {
    console.log(`   • ${u.name} <${u.email}> [${u.role}]`);
  });
  console.log("\n🚀 You can now log in and start entering your real data.");
}

main()
  .catch(e => { console.error("\n❌ Reset failed:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
