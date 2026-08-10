import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { mosqueRequests, requestHistory } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }

  const [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 29));
  console.log("=== REQUEST 29 VERIFICATION ===");
  console.log("ID:", request.id);
  console.log("Request Number:", request.requestNumber);
  console.log("Current Stage:", request.currentStage);
  console.log("Status:", request.status);
  console.log("Department:", request.currentResponsibleDepartment);

  const history = await db
    .select()
    .from(requestHistory)
    .where(eq(requestHistory.requestId, 29))
    .orderBy(desc(requestHistory.createdAt));

  console.log("=== RECENT HISTORY ===");
  console.log(history.slice(0, 3));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
