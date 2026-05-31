import { getDb } from "../server/db";
import { permissions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  const updates = [
    { id: "contracts.view", nameAr: "عرض العقود" },
    { id: "contracts.create", nameAr: "إنشاء عقود" },
    { id: "contracts.template_add", nameAr: "إضافة قالب للعقود" },
  ];

  console.log("Updating permission names in database...");
  for (const item of updates) {
    try {
      await db.update(permissions).set({ nameAr: item.nameAr }).where(eq(permissions.id, item.id));
      console.log(`✅ Updated permission name for: ${item.id} -> ${item.nameAr}`);
    } catch (e: any) {
      console.error(`❌ Error updating ${item.id}:`, e.message);
    }
  }
}

main().catch(console.error);
