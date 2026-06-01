import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { roles, permissions, rolePermissions } from "../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";

// We will dynamically import calculateUserPermissions to trigger ensureRequestsPermissionsExist if needed,
// or we can import the router and call it. But the easiest is to replicate the ensure functions or import permissions.ts.
// Let's call trpc query getStructure which calls ensureRequestsPermissionsExist!
import { permissionsRouter } from "../server/permissions";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  console.log("=== Running getStructure to trigger permissions seeding ===");
  const caller = permissionsRouter.createCaller({
    user: { id: 1, role: "super_admin" },
    session: null,
    req: null,
    res: null
  } as any);

  await caller.getStructure();
  console.log("Migration triggered successfully!");

  // Let's query project_manager permissions to verify projects.view_details is seeded
  const postPerms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, "project_manager"));
  console.log("Projects permissions present for project_manager:", postPerms.filter(p => p.permissionId.startsWith("projects.")));

  process.exit(0);
}

main().catch(console.error);
