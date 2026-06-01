import dotenv from "dotenv";
dotenv.config();

import { getDb } from "./server/db";
import { appRouter } from "./server/routers";
import type { TrpcContext } from "./server/_core/context";

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
    const result = await caller.permissions.getRolePermissions({ roleId: "project_manager" });
    console.log("getRolePermissions RESULT:", result);
  } catch (err) {
    console.error("TRPC error:", err);
  }
  process.exit(0);
}

main();
