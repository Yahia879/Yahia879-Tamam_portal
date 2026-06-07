import "dotenv/config";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) return;

  const [u] = await db.select().from(users).where(eq(users.id, 84)).limit(1);
  console.log("User 84:", u);
  process.exit(0);
}

run().catch(console.error);
