import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { userPermissions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  const overrides = await db.select().from(userPermissions).where(eq(userPermissions.userId, 1));
  console.log(`User 1 has ${overrides.length} direct overrides in database:`);
  for (const o of overrides) {
    console.log(`PermissionId: ${o.permissionId} | Granted: ${o.granted}`);
  }
  process.exit(0);
}

main().catch(console.error);
