import dotenv from "dotenv";
dotenv.config();

import { getDb } from "./server/db";
import { roles, rolePermissions } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }
  
  try {
    const allRoles = await db.select().from(roles);
    for (const r of allRoles) {
      console.log(`\n================ ROLE: ${r.id} (${r.nameAr}) ================`);
      console.log(`isSystem: ${r.isSystem}`);
      try {
        const parsed = JSON.parse(r.description || "[]");
        console.log("Description JSON has requests:", parsed.filter(p => p.startsWith("requests.")));
      } catch {
        console.log("Description is not valid JSON:", r.description);
      }
      
      const rolePerms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, r.id));
      console.log("role_permissions table has requests:", rolePerms.map(p => p.permissionId).filter(p => p.startsWith("requests.")));
    }
  } catch (err) {
    console.error("DB error:", err);
  }
  process.exit(0);
}

main();
