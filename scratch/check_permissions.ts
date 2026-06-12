import { getDb } from "../server/db";
import { permissions } from "../drizzle/schema";
import { like } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }

  try {
    const rows = await db.select().from(permissions).where(like(permissions.id, "requesters%"));
    console.log("Permissions in DB:", JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main().then(() => process.exit(0));
