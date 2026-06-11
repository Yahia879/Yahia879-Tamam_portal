import "dotenv/config";
import { getDb } from "../server/db";
import { mosqueRequests, mosques, fieldVisitReports, quickResponseReports, finalReports, users } from "../drizzle/schema";
import { eq, and, or, isNotNull, desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    process.exit(1);
  }

  try {
    console.log("=== Querying the 10 most recent requests with assignments ===");
    
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
        createdAt: mosqueRequests.createdAt,
      })
      .from(mosqueRequests)
      .where(
        or(
          isNotNull(mosqueRequests.fieldVisitAssignedTo),
          isNotNull(mosqueRequests.assignedTo),
          isNotNull(mosqueRequests.finalReportAssignedTo)
        )
      )
      .orderBy(desc(mosqueRequests.id))
      .limit(15);

    for (const req of requests) {
      console.log(`\n---------------- Request ID: ${req.id} (Number: ${req.requestNumber}) ----------------`);
      console.log(`Created At: ${req.createdAt}`);
      console.log(`Track: ${req.requestTrack} | Current Stage: ${req.currentStage} | Status: ${req.status}`);
      console.log(`Assignments:`);
      console.log(`  - Field Visit Assigned To: ${req.fieldVisitAssignedTo}`);
      console.log(`  - General/Quick Response Assigned To: ${req.assignedTo}`);
      console.log(`  - Final Report Assigned To: ${req.finalReportAssignedTo}`);

      // Check reports in DB
      const fvRep = await db.select().from(fieldVisitReports).where(eq(fieldVisitReports.requestId, req.id));
      const qrRep = await db.select().from(quickResponseReports).where(eq(quickResponseReports.requestId, req.id));
      const fnRep = await db.select().from(finalReports).where(eq(finalReports.requestId, req.id));

      console.log(`Existing Reports:`);
      console.log(`  - Field Visit Reports Count: ${fvRep.length}`);
      console.log(`  - Quick Response Reports Count: ${qrRep.length}`);
      console.log(`  - Final Reports Count: ${fnRep.length}`);

      // Evaluate criteria
      if (req.fieldVisitAssignedTo) {
        const hasReport = fvRep.length > 0;
        const correctStage = req.currentStage === 'field_visit';
        console.log(`  > Field Visit: Has report: ${hasReport} | Stage is field_visit: ${correctStage} | Will show: ${(!hasReport && correctStage) ? "YES" : "NO"}`);
      }
      if (req.assignedTo && req.requestTrack === 'quick_response') {
        const hasReport = qrRep.length > 0;
        const correctStage = req.currentStage === 'execution';
        console.log(`  > Quick Response: Has report: ${hasReport} | Stage is execution: ${correctStage} | Will show: ${(!hasReport && correctStage) ? "YES" : "NO"}`);
      }
      if (req.finalReportAssignedTo) {
        const hasReport = fnRep.length > 0;
        console.log(`  > Final Report: Has report: ${hasReport} | Will show: ${(!hasReport) ? "YES" : "NO"}`);
      }
    }

  } catch (err) {
    console.error("Error running query:", err);
  }
  process.exit(0);
}

main();
