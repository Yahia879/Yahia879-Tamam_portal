import "dotenv/config";
import { getDb } from "../server/db";
import { contractsEnhanced, contractPayments, payments, contracts, quotations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) return;

  const [c] = await db.select().from(contractsEnhanced).where(eq(contractsEnhanced.id, 16));
  console.log("Full Contract 16 data:", JSON.stringify(c, null, 2));

  if (c?.requestId) {
    console.log("Contract 16 has requestId:", c.requestId);
  }
  if (c?.projectId) {
    console.log("Contract 16 has projectId:", c.projectId);
    const oldPayments = await db.select().from(payments).where(eq(payments.projectId, c.projectId));
    console.log("Old payments for projectId:", oldPayments);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
