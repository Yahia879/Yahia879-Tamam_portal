import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { users, userRoleAssignments, rolePermissions } from "../drizzle/schema";
import { calculateUserPermissions } from "../server/permissions";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  const allUsers = await db.select().from(users);
  console.log("=== Users in Database ===");
  for (const u of allUsers) {
    const rolesAssigned = await db.select().from(userRoleAssignments).where(eq(userRoleAssignments.userId, u.id));
    const perms = await calculateUserPermissions(u.id);
    console.log(`User: ${u.username} (ID: ${u.id})`);
    console.log(`- Base Role: ${u.role}`);
    console.log(`- Assigned Roles:`, rolesAssigned.map(r => r.roleId));
    console.log(`- Has requests.view:`, perms.includes("requests.view"));
    console.log(`- Has requests.create:`, perms.includes("requests.create"));
    console.log(`- Has requests.view_details:`, perms.includes("requests.view_details"));
    console.log(`- Requests Perms:`, perms.filter(p => p.startsWith("requests.")));
  }

  process.exit(0);
}

main().catch(console.error);
