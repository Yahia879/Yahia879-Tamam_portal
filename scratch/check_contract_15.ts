import "dotenv/config";
import { getDb } from "../server/db";
import { contractsEnhanced } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkContract() {
  const db = await getDb();
  if (!db) {
    console.error("No DB");
    return;
  }
  const [c] = await db.select().from(contractsEnhanced).where(eq(contractsEnhanced.id, 15));
  console.log("CONTRACT 15 DB ROW:", JSON.stringify(c, null, 2));
  process.exit(0);
}

checkContract().catch(err => {
  console.error(err);
  process.exit(1);
});
