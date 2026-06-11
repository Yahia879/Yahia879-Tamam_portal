import "dotenv/config";
import { getDb } from "../server/db";
import { mosqueRequests, fieldVisitReports, quickResponseReports, finalReports } from "../drizzle/schema";
import { eq, and, or, isNotNull } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    process.exit(1);
  }

  try {
    console.log("=== Searching for assignments without reports that are NOT showing on the page ===");

    // Fetch all requests
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

      let issueFound = false;
      let reasons: string[] = [];

      // 1. Field Visit Assignment without report but stage is not field_visit
      if (req.fieldVisitAssignedTo && fvRep.length === 0 && req.currentStage !== 'field_visit') {
        issueFound = true;
        reasons.push(`Field Visit is assigned but currentStage is '${req.currentStage}' (needs to be 'field_visit' to show on page)`);
      }

      // 2. Quick Response Assignment without report but stage is not execution
      if (req.assignedTo && req.requestTrack === 'quick_response' && qrRep.length === 0 && req.currentStage !== 'execution') {
        issueFound = true;
        reasons.push(`Quick Response is assigned but currentStage is '${req.currentStage}' (needs to be 'execution' to show on page)`);
      }

      // 3. Final Report Assignment without report but request is closed or rejected
      if (req.finalReportAssignedTo && fnRep.length === 0 && (req.currentStage === 'closed' || req.status === 'rejected')) {
        issueFound = true;
        reasons.push(`Final Report is assigned but request is closed/rejected`);
      }

      if (issueFound) {
        count++;
        console.log(`\n🚨 Issue found in Request ID: ${req.id} (Number: ${req.requestNumber})`);
        console.log(`   Track: ${req.requestTrack} | Stage: ${req.currentStage} | Status: ${req.status}`);
        console.log(`   Assignments: Field Visit: ${req.fieldVisitAssignedTo} | QR Assigned: ${req.assignedTo} | Final Report: ${req.finalReportAssignedTo}`);
        reasons.forEach(r => console.log(`   -> ${r}`));
      }
    }

    console.log(`\nTotal issues found: ${count}`);

  } catch (err) {
    console.error("Error running query:", err);
  }
  process.exit(0);
}

main();
