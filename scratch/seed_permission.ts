import "dotenv/config";
import { getDb } from "../server/db";
import { permissions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(permissions).where(eq(permissions.id, "contracts.edit_approved"));
  if (existing.length === 0) {
    await db.insert(permissions).values({
      id: "contracts.edit_approved",
      moduleId: "contracts",
      action: "edit_approved",
      nameAr: "تعديل العقود المعتمدة",
      nameEn: "Edit Approved Contracts",
    });
    console.log("Successfully inserted contracts.edit_approved into permissions table!");
  } else {
    console.log("contracts.edit_approved already exists in permissions table.");
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
