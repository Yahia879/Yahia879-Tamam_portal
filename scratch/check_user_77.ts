import "dotenv/config";
import { calculateUserPermissions } from "../server/permissions";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection!");
    process.exit(1);
  }

  const userId = 77;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    console.error(`User with ID ${userId} not found.`);
    process.exit(1);
  }

  console.log("User Info:", {
    id: user.id,
    name: user.name,
    role: user.role,
  });

  const permissions = await calculateUserPermissions(userId);
  console.log("Calculated Permissions:", permissions);
}

main().catch(console.error);
