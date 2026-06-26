import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { disbursementOrders, disbursementRequests } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }
  
  try {
    const orders = await db.select().from(disbursementOrders);
    console.log("LIST OF ALL ORDERS:");
    for (const o of orders) {
      const [req] = o.disbursementRequestId
        ? await db.select().from(disbursementRequests).where(eq(disbursementRequests.id, o.disbursementRequestId))
        : [null];
      console.log(`- Order ID ${o.id}: Num ${o.orderNumber}, Beneficiary: ${o.beneficiaryName}, Amount: ${o.amount}`);
      if (req) {
        console.log(`  └─ Request ID ${req.id}: Num ${req.requestNumber}, Title: ${req.title}, Attachments: ${req.attachmentsJson}`);
      }
    }
  } catch (err) {
    console.error("Error listing db:", err);
  }
  process.exit(0);
}

main();
