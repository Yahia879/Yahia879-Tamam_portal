import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { modules, permissions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("❌ No DB connection");
    return;
  }

  console.log("Seeding support module and permissions...");

  // 1. Insert support module
  const [existingSupportModule] = await db.select({ id: modules.id }).from(modules).where(eq(modules.id, "technical_support")).limit(1);
  if (!existingSupportModule) {
    await db.insert(modules).values({
      id: "technical_support",
      nameAr: "الدعم الفني",
      nameEn: "Technical Support",
      icon: "LifeBuoy",
      displayOrder: 12,
      isActive: true
    });
    console.log("✅ Inserted module: technical_support");
  } else {
    console.log("✨ Module already exists: technical_support");
  }

  // 2. Insert permissions
  const customPerms = [
    { id: "Create_Ticket", moduleId: "technical_support", action: "create", nameAr: "إنشاء تذكرة دعم فني", nameEn: "Create Support Ticket" },
    { id: "View_Tickets", moduleId: "technical_support", action: "view", nameAr: "عرض تذاكر الدعم الفني", nameEn: "View Support Tickets" },
  ];

  for (const p of customPerms) {
    const [existing] = await db.select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.id, p.id))
      .limit(1);
    
    if (!existing) {
      await db.insert(permissions).values(p);
      console.log(`✅ Inserted permission: ${p.id}`);
    } else {
      console.log(`✨ Permission already exists: ${p.id}`);
    }
  }

  console.log("🎉 Seeding complete!");
  process.exit(0);
}

main().catch(console.error);
