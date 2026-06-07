import "dotenv/config";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq, inArray, and, isNull } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to DB");
    return;
  }

  const roles = ["corporate_comm"];
  const targetUsersByRole = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(inArray(users.role, roles), isNull(users.deletedAt)));

  console.log("targetUsersByRole:", targetUsersByRole);
  process.exit(0);
}

run().catch(console.error);
