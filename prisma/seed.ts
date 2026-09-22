/**
 * BuildSpark — Seed File
 * Only creates the 3 user accounts and company settings.
 * NO sample projects, inventory, or any dummy data.
 * Safe to run on every deploy — upsert means it never duplicates.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding users...");

  const adminPassword = await bcrypt.hash("Admin@2024!", 12);
  await prisma.user.upsert({
    where: { email: "admin@sparkconst.co.ug" },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@sparkconst.co.ug",
      password: adminPassword,
      role: "SYSTEM_ADMIN",
      phone: "+256700000001",
      mtnNumber: "+256770000001",
    },
  });

  const smPassword = await bcrypt.hash("Manager@2024!", 12);
  await prisma.user.upsert({
    where: { email: "manager@sparkconst.co.ug" },
    update: {},
    create: {
      name: "John Kato",
      email: "manager@sparkconst.co.ug",
      password: smPassword,
      role: "SITE_MANAGER",
      phone: "+256700000002",
      mtnNumber: "+256770000002",
    },
  });

  const accPassword = await bcrypt.hash("Account@2024!", 12);
  await prisma.user.upsert({
    where: { email: "accounts@sparkconst.co.ug" },
    update: {},
    create: {
      name: "Grace Namukasa",
      email: "accounts@sparkconst.co.ug",
      password: accPassword,
      role: "ACCOUNTANT",
      phone: "+256700000003",
      airtelNumber: "+256750000003",
    },
  });

  // Company settings — only creates if not exists, never overwrites your changes
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Spark Construction Limited",
      currency: "UGX",
      currencySymbol: "UGX",
      email: "info@sparkconst.co.ug",
      phone: "+256700000000",
      address: "Kampala, Uganda",
      pesapalKey: process.env.PESAPAL_CONSUMER_KEY,
      pesapalSecret: process.env.PESAPAL_CONSUMER_SECRET,
      geminiKey: process.env.GEMINI_API_KEY,
    },
  });

  console.log("✅ Seed complete — users and company settings only. No dummy data.");
  console.log("\n📋 Login Credentials:");
  console.log("  Admin:       admin@sparkconst.co.ug  /  Admin@2024!");
  console.log("  Manager:     manager@sparkconst.co.ug  /  Manager@2024!");
  console.log("  Accountant:  accounts@sparkconst.co.ug  /  Account@2024!");
}

main()
  .catch((e) => { console.warn("⚠️  Seed warning (non-fatal):", e.message); })
  .finally(() => prisma.$disconnect());
