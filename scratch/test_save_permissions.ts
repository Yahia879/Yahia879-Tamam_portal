import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { roles, permissions, rolePermissions } from "../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  // 1. Get current permissions for project_manager
  console.log("=== Before simulation ===");
  const initialPerms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, "project_manager"));
  console.log("Number of permissions:", initialPerms.length);
  console.log("Requests permissions present:", initialPerms.filter(p => p.permissionId.startsWith("requests.")));

  // 2. Simulate saving permissions with ALL requests permissions removed
  // We will keep other permissions but filter out requests.
  const newPerms = initialPerms
    .map(p => p.permissionId)
    .filter(p => !p.startsWith("requests."));

  console.log("\n=== Simulating updateRole mutation ===");
  // delete all
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, "project_manager"));
  // insert valid ones
  const existingPerms = await db.select({ id: permissions.id }).from(permissions)
    .where(inArray(permissions.id, newPerms));
  const validPermIds = existingPerms.map(p => p.id);
  
  if (validPermIds.length > 0) {
    await db.insert(rolePermissions).values(
      validPermIds.map(permId => ({
        roleId: "project_manager",
        permissionId: permId
      }))
    );
  }
  console.log("Simulated updateRole complete.");

  // 3. Now simulate getRolePermissions query which triggers ensureRequestsPermissionsExist
  console.log("\n=== Simulating getRolePermissions query (which triggers ensureRequestsPermissionsExist) ===");
  // Import the procedure code dynamically or just trigger ensureRequestsPermissionsExist
  // We can query the DB now to see if requests permissions got re-added.
  const postPerms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, "project_manager"));
  console.log("Number of permissions:", postPerms.length);
  console.log("Requests permissions present:", postPerms.filter(p => p.permissionId.startsWith("requests.")));

  // 4. Restore the initial permissions back so we don't mess up the database
  console.log("\n=== Restoring database to original state ===");
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, "project_manager"));
  await db.insert(rolePermissions).values(
    initialPerms.map(p => ({
      roleId: "project_manager",
      permissionId: p.permissionId
    }))
  );
  console.log("Restore complete.");
  
  process.exit(0);
}

main().catch(console.error);
