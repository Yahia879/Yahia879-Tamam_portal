import "dotenv/config";
import { getDb } from "../server/db";
import { mosqueRequests, fieldVisitReports, quickResponseReports, finalReports, users } from "../drizzle/schema";
import { eq, and, or, isNotNull, desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    process.exit(1);
  }

  try {
    console.log("=== Querying ALL requests that have assignments but NO submitted reports ===");
    
    const requests = await db
      .select({
        id: mosqueRequests.id,
        requestNumber: mosqueRequests.requestNumber,
        currentStage: mosqueRequests.currentStage,
        status: mosqueRequests.status,
        requestTrack: mosqueRequests.requestTrack,
        fieldVisitAssignedTo: mosqueRequests.fieldVisitAssignedTo,
        assignedTo: mosqueRequests.assignedTo,
        finalReportAssignedTo: mosqueRequests.finalReportAssignedTo,
      })
      .from(mosqueRequests)
      .where(
        or(
          isNotNull(mosqueRequests.fieldVisitAssignedTo),
          isNotNull(mosqueRequests.assignedTo),
          isNotNull(mosqueRequests.finalReportAssignedTo)
        )
      );

    let count = 0;
    for (const req of requests) {
      const fvRep = await db.select().from(fieldVisitReports).where(eq(fieldVisitReports.requestId, req.id));
      const qrRep = await db.select().from(quickResponseReports).where(eq(quickResponseReports.requestId, req.id));
      const fnRep = await db.select().from(finalReports).where(eq(finalReports.requestId, req.id));

      const needsFvReport = req.fieldVisitAssignedTo && fvRep.length === 0;
      const needsQrReport = req.assignedTo && req.requestTrack === 'quick_response' && qrRep.length === 0;
      const needsFnReport = req.finalReportAssignedTo && fnRep.length === 0;

      if (needsFvReport || needsQrReport || needsFnReport) {
        count++;
        console.log(`\n📌 Request ID: ${req.id} (Number: ${req.requestNumber})`);
        console.log(`   Track: ${req.requestTrack} | Stage: ${req.currentStage} | Status: ${req.status}`);
        
        if (needsFvReport) {
          const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.fieldVisitAssignedTo));
          console.log(`   [!] Needs Field Visit Report (Assigned to: ${u?.name || req.fieldVisitAssignedTo})`);
        }
        if (needsQrReport) {
          const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.assignedTo));
          console.log(`   [!] Needs Quick Response Report (Assigned to: ${u?.name || req.assignedTo})`);
        }
        if (needsFnReport) {
          const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.finalReportAssignedTo));
          console.log(`   [!] Needs Final Report (Assigned to: ${u?.name || req.finalReportAssignedTo})`);
        }
      }
    }

    console.log(`\nTotal requests needing reports: ${count}`);

  } catch (err) {
    console.error("Error running query:", err);
  }
  process.exit(0);
}

main();
