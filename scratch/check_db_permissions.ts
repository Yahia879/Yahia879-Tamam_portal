import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { roles, permissions, rolePermissions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  console.log("=== Permissions in DB ===");
  const allPerms = await db.select().from(permissions);
  console.log(allPerms.filter(p => p.id.startsWith("requests.")));

  console.log("\n=== Role Permissions for project_manager ===");
  const pmPerms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, "project_manager"));
  console.log(pmPerms);
  
  process.exit(0);
}

main().catch(console.error);
