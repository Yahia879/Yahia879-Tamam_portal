import { getDb } from "../server/db";
import { modules } from "../drizzle/schema";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  const allModules = await db.select().from(modules);
  console.log("Modules in database:", allModules.map(m => m.id));
}

main().catch(console.error);
