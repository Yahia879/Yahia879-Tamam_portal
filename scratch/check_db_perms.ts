import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { permissions } from "../drizzle/schema";
import { like } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  const dbPerms = await db.select().from(permissions).where(like(permissions.id, "disbursements.%"));
  console.log(`Found ${dbPerms.length} permissions matching 'disbursements.%' in database:`);
  for (const p of dbPerms) {
    console.log(`ID: ${p.id} | ModuleId: ${p.moduleId} | Action: ${p.action} | NameAr: ${p.nameAr}`);
  }
  process.exit(0);
}

main().catch(console.error);
