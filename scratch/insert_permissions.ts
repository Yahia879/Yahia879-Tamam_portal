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

  const newPerms = [
    {
      id: "contracts.template_add",
      moduleId: "contracts",
      action: "template_add",
      nameAr: "إضافة قالب عقد",
      nameEn: "Add Contract Template",
      description: "صلاحية إضافة قالب عقد جديد",
    },
    {
      id: "contracts.template_edit",
      moduleId: "contracts",
      action: "template_edit",
      nameAr: "تعديل قالب العقد",
      nameEn: "Edit Contract Template",
      description: "صلاحية تعديل قوالب العقود",
    },
    {
      id: "contracts.template_delete",
      moduleId: "contracts",
      action: "template_delete",
      nameAr: "حذف قالب العقد",
      nameEn: "Delete Contract Template",
      description: "صلاحية حذف قالب عقد",
    },
    {
      id: "contracts.clause_add",
      moduleId: "contracts",
      action: "clause_add",
      nameAr: "إضافة بند للعقد",
      nameEn: "Add Contract Clause",
      description: "صلاحية إضافة بند جديد لقالب العقد",
    },
  ];

  console.log("Adding new permissions to database...");
  for (const perm of newPerms) {
    try {
      const [existing] = await db.select().from(permissions).where(eq(permissions.id, perm.id)).limit(1);
      if (!existing) {
        await db.insert(permissions).values(perm);
        console.log(`✅ Added permission: ${perm.id}`);
      } else {
        console.log(`✨ Permission already exists: ${perm.id}`);
      }
    } catch (e: any) {
      console.error(`❌ Error adding ${perm.id}:`, e.message);
    }
  }
}

main().catch(console.error);
