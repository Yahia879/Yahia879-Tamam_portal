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
    const [order] = await db.select().from(disbursementOrders).where(eq(disbursementOrders.id, 17));
    console.log("ORDER 17:", JSON.stringify(order, null, 2));
    
    if (order && order.disbursementRequestId) {
      const [req] = await db.select().from(disbursementRequests).where(eq(disbursementRequests.id, order.disbursementRequestId));
      console.log("REQUEST:", JSON.stringify(req, null, 2));
    }
  } catch (err) {
    console.error("Error checking db:", err);
  }
  process.exit(0);
}

main();
