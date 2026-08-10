import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { mosqueRequests, projects, contractsEnhanced, payments } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }

  const [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 29));
  console.log("=== REQUEST 29 ===");
  console.log(request);

  if (request) {
    const projectList = await db.select().from(projects).where(eq(projects.requestId, 29));
    console.log("=== PROJECTS FOR REQ 29 ===");
    console.log(projectList);

    if (projectList.length > 0) {
      const projId = projectList[0].id;
      const contracts = await db.select().from(contractsEnhanced).where(eq(contractsEnhanced.projectId, projId));
      console.log("=== CONTRACTS ===");
      console.log(contracts);

      const payList = await db.select().from(payments).where(eq(payments.projectId, projId));
      console.log("=== PAYMENTS ===");
      console.log(payList);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
