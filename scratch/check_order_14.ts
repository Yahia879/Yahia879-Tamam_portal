import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { disbursementOrders, disbursementRequests, projects, contractsEnhanced } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }
  
  try {
    const [order] = await db.select().from(disbursementOrders).where(eq(disbursementOrders.id, 14));
    console.log("ORDER 14:", JSON.stringify(order, null, 2));
    
    if (order && order.disbursementRequestId) {
      const [req] = await db.select().from(disbursementRequests).where(eq(disbursementRequests.id, order.disbursementRequestId));
      console.log("REQUEST:", JSON.stringify(req, null, 2));
      
      if (req && req.projectId) {
        const [proj] = await db.select().from(projects).where(eq(projects.id, req.projectId));
        console.log("PROJECT:", JSON.stringify(proj, null, 2));
        
        const contracts = await db.select().from(contractsEnhanced).where(eq(contractsEnhanced.projectId, req.projectId));
        console.log("CONTRACTS:", JSON.stringify(contracts, null, 2));
      }
    }
  } catch (err) {
    console.error("Error checking db:", err);
  }
  process.exit(0);
}

main();
