import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("Admin@2024!", 12);
  const admin = await prisma.user.upsert({
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

  // Site Manager
  const smPassword = await bcrypt.hash("Manager@2024!", 12);
  const siteManager = await prisma.user.upsert({
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

  // Accountant
  const accPassword = await bcrypt.hash("Account@2024!", 12);
  const accountant = await prisma.user.upsert({
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

  // Company settings
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Spark Construction Limited",
      currency: "UGX",
      currencySymbol: "UGX",
      mtnNumber: "+256770000001",
      airtelNumber: "+256750000001",
      email: "info@sparkconst.co.ug",
      phone: "+256700000000",
      address: "Plot 45, Kampala Road, Kampala, Uganda",
      pesapalKey: process.env.PESAPAL_CONSUMER_KEY,
      pesapalSecret: process.env.PESAPAL_CONSUMER_SECRET,
      geminiKey: process.env.GEMINI_API_KEY,
    },
  });

  // Sample project
  const project = await prisma.project.upsert({
    where: { id: "sample-project-001" },
    update: {},
    create: {
      id: "sample-project-001",
      name: "Nakawa Residential Complex",
      description: "5-floor residential building with 20 apartments",
      location: "Nakawa, Kampala",
      latitude: 0.3397,
      longitude: 32.6171,
      status: "ACTIVE",
      budget: 500000000,
      createdById: admin.id,
    },
  });

  // Assign site manager
  await prisma.projectAssignment.upsert({
    where: { id: "assignment-001" },
    update: {},
    create: {
      id: "assignment-001",
      projectId: project.id,
      userId: siteManager.id,
      assignedBy: admin.id,
      isActive: true,
    },
  });

  // Inventory items
  const inventoryItems = [
    { name: "Portland Cement (50kg bag)", unit: "bags", category: "MATERIALS", unitPrice: 32000, currentQuantity: 200, minimumQuantity: 50 },
    { name: "River Sand (Tonne)", unit: "tonnes", category: "MATERIALS", unitPrice: 120000, currentQuantity: 15, minimumQuantity: 5 },
    { name: "Crushed Stone (Tonne)", unit: "tonnes", category: "MATERIALS", unitPrice: 150000, currentQuantity: 10, minimumQuantity: 5 },
    { name: "Iron Bar (Y16)", unit: "pieces", category: "MATERIALS", unitPrice: 85000, currentQuantity: 100, minimumQuantity: 20 },
    { name: "Iron Bar (Y12)", unit: "pieces", category: "MATERIALS", unitPrice: 55000, currentQuantity: 80, minimumQuantity: 20 },
    { name: "Roofing Tiles", unit: "pieces", category: "MATERIALS", unitPrice: 3500, currentQuantity: 500, minimumQuantity: 100 },
    { name: "Timber (2x4x12ft)", unit: "pieces", category: "MATERIALS", unitPrice: 18000, currentQuantity: 60, minimumQuantity: 20 },
    { name: "Nails (1kg box)", unit: "boxes", category: "MATERIALS", unitPrice: 8500, currentQuantity: 30, minimumQuantity: 10 },
    { name: "Plumbing Pipes (PVC 2 inch)", unit: "metres", category: "MATERIALS", unitPrice: 12000, currentQuantity: 50, minimumQuantity: 20 },
    { name: "Electrical Wire (per metre)", unit: "metres", category: "MATERIALS", unitPrice: 4500, currentQuantity: 200, minimumQuantity: 50 },
    { name: "Paint (20L bucket)", unit: "buckets", category: "MATERIALS", unitPrice: 180000, currentQuantity: 20, minimumQuantity: 5 },
    { name: "Diesel (Litres)", unit: "litres", category: "UTILITIES", unitPrice: 5500, currentQuantity: 100, minimumQuantity: 30 },
    { name: "Binding Wire (1kg)", unit: "kgs", category: "MATERIALS", unitPrice: 12000, currentQuantity: 25, minimumQuantity: 10 },
    { name: "Bricks (per 1000)", unit: "thousands", category: "MATERIALS", unitPrice: 350000, currentQuantity: 5, minimumQuantity: 2 },
    { name: "Waterproof Sheet", unit: "rolls", category: "MATERIALS", unitPrice: 45000, currentQuantity: 15, minimumQuantity: 5 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { name: item.name },
      update: {},
      create: { ...item, addedById: admin.id },
    });
  }

  console.log("✅ Seed complete!");
  console.log("\n📋 Login Credentials:");
  console.log("  Admin:       admin@sparkconst.co.ug / Admin@2024!");
  console.log("  Manager:     manager@sparkconst.co.ug / Manager@2024!");
  console.log("  Accountant:  accounts@sparkconst.co.ug / Account@2024!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
