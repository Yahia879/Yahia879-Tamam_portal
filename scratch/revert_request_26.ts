import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { mosqueRequests } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }

  const requestId = 26;
  console.log(`Reverting request #${requestId} to stage 'technical_eval'...`);

  const [req] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, requestId));
  if (!req) {
    console.error(`Request #${requestId} not found`);
    process.exit(1);
  }

  console.log(`Current state for Request #${requestId}:`, {
    currentStage: req.currentStage,
    status: req.status,
    requestTrack: req.requestTrack,
    technicalEvalDecision: req.technicalEvalDecision,
  });

  await db
    .update(mosqueRequests)
    .set({
      currentStage: "technical_eval",
      status: "under_review",
      requestTrack: "standard",
      technicalEvalDecision: null,
      technicalEvalJustification: null,
    })
    .where(eq(mosqueRequests.id, requestId));

  console.log(`Successfully reverted Request #${requestId} to stage 'technical_eval'!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error executing script:", err);
  process.exit(1);
});
