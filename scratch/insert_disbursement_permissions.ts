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
      id: "disbursement_orders.view",
      moduleId: "disbursements",
      action: "view",
      nameAr: "عرض أوامر الصرف",
      nameEn: "View Disbursement Orders",
      description: "صلاحية عرض أوامر الصرف",
    },
    {
      id: "disbursement_orders.approve",
      moduleId: "disbursements",
      action: "approve",
      nameAr: "اعتماد أوامر الصرف",
      nameEn: "Approve Disbursement Orders",
      description: "صلاحية اعتماد أوامر الصرف",
    },
    {
      id: "disbursement_orders.reject",
      moduleId: "disbursements",
      action: "reject",
      nameAr: "رفض أوامر الصرف",
      nameEn: "Reject Disbursement Orders",
      description: "صلاحية رفض أوامر الصرف",
    },
    {
      id: "disbursement_orders.view_details",
      moduleId: "disbursements",
      action: "view_details",
      nameAr: "عرض تفاصيل أوامر الصرف",
      nameEn: "View Disbursement Orders Details",
      description: "صلاحية عرض تفاصيل أوامر الصرف",
    },
  ];

  console.log("Adding new disbursement order permissions to database...");
  for (const perm of newPerms) {
    try {
      const [existing] = await db.select().from(permissions).where(eq(permissions.id, perm.id)).limit(1);
      if (!existing) {
        await db.insert(permissions).values(perm);
        console.log(`✅ Added permission: ${perm.id}`);
      } else {
        await db.update(permissions).set({ nameAr: perm.nameAr, moduleId: perm.moduleId }).where(eq(permissions.id, perm.id));
        console.log(`✨ Updated permission: ${perm.id}`);
      }
    } catch (e: any) {
      console.error(`❌ Error adding/updating ${perm.id}:`, e);
    }
  }
}

main().catch(console.error);
