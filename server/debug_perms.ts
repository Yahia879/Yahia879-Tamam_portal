import "dotenv/config";
import { getDb } from "./db";
import { users, userPermissions, rolePermissions, permissions } from "../drizzle/schema";
import { calculateUserPermissions } from "./permissions";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB");
    process.exit(1);
  }

  // 1. Find field_team or users
  const allUsers = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users);
  console.log("Users:", JSON.stringify(allUsers, null, 2));

  const u4Perms = await db.select().from(userPermissions).where(eq(userPermissions.userId, 4));
  console.log("User 4 userPermissions:", JSON.stringify(u4Perms, null, 2));

  const u4Calc = await calculateUserPermissions(4, "field_team");
  console.log("User 4 calculated:", JSON.stringify(u4Calc, null, 2));

  process.exit(0);
}

main().catch(console.error);
