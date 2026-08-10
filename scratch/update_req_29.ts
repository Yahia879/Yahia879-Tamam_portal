import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { mosqueRequests, requestHistory, requestStageTracking } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }

  // 1. Get current request 29
  const [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 29));
  if (!request) {
    console.error("Request 29 not found!");
    process.exit(1);
  }

  console.log("Current stage of request 29:", request.currentStage);

  const oldStage = request.currentStage;
  const newStage = "handover";

  // 2. Update mosqueRequests
  await db
    .update(mosqueRequests)
    .set({
      currentStage: newStage,
      status: "in_progress",
      currentResponsibleDepartment: "الاتصال المؤسسي",
      updatedAt: new Date(),
    })
    .where(eq(mosqueRequests.id, 29));

  // 3. Add to requestHistory
  await db.insert(requestHistory).values({
    requestId: 29,
    userId: request.userId || 1,
    fromStage: oldStage,
    toStage: newStage,
    action: "stage_updated",
    notes: "تم تحويل الطلب إلى مرحلة الاستلام",
  });

  // 4. Check/Insert into requestStageTracking if exists
  const existingTracking = await db
    .select()
    .from(requestStageTracking)
    .where(eq(requestStageTracking.requestId, 29));

  console.log("Existing tracking records:", existingTracking.length);

  // Record entry in requestStageTracking for handover
  await db.insert(requestStageTracking).values({
    requestId: 29,
    stage: newStage,
    enteredAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("Successfully updated Request 29 to stage 'handover' (الاستلام).");

  // Verify
  const [updatedReq] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, 29));
  console.log("Updated Request 29 state:", {
    id: updatedReq.id,
    requestNumber: updatedReq.requestNumber,
    currentStage: updatedReq.currentStage,
    status: updatedReq.status,
    currentResponsibleDepartment: updatedReq.currentResponsibleDepartment,
    updatedAt: updatedReq.updatedAt,
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("Error updating request 29:", err);
  process.exit(1);
});
