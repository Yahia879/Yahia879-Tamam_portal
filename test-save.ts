import dotenv from "dotenv";
dotenv.config();

import { getDb } from "./server/db";
import { appRouter } from "./server/routers";
import type { TrpcContext } from "./server/_core/context";
import { roles, rolePermissions } from "./drizzle/schema";
import { eq } from "drizzle-orm";

function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-123",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "email",
      role: "super_admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }
  
  try {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    // Simulate updating projects_office with requests.view_details
    console.log("Updating projects_office...");
    await caller.permissions.updateRole({
      roleId: "projects_office",
      permissions: [
        "mosques.view",
        "requests.view",
        "requests.create",
        "requests.view_details", // the new permission
      ]
    });
    
    // Read from DB
    const [roleData] = await db.select().from(roles).where(eq(roles.id, "projects_office")).limit(1);
    console.log("Updated projects_office description (JSON):", roleData?.description);
    
    const rolePerms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, "projects_office"));
    console.log("Updated projects_office role_permissions table:", rolePerms.map(p => p.permissionId));
  } catch (err) {
    console.error("TRPC error:", err);
  }
  process.exit(0);
}

main();
