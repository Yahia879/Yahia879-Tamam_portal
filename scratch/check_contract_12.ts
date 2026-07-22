import "dotenv/config";
import { getDb } from "../server/db";
import { contractsEnhanced } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) return;

  await db
    .update(contractsEnhanced)
    .set({ customClausesJson: null })
    .where(eq(contractsEnhanced.id, 12));

  console.log("Contract 12 customClausesJson reset to null successfully");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
