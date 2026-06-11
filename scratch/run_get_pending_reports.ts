import "dotenv/config";
import { getDb } from "../server/db";
import { mosqueRequests, mosques, fieldVisitReports, quickResponseReports, finalReports, users } from "../drizzle/schema";
import { eq, and, or, isNotNull, inArray, sql } from "drizzle-orm";

async function getPendingReports() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch all requests that might have reports
  const activeRequests = await db.select({
    request: mosqueRequests,
    mosque: mosques,
  })
  .from(mosqueRequests)
  .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
  .where(
    and(
      or(
        isNotNull(mosqueRequests.fieldVisitAssignedTo),
        and(
          eq(mosqueRequests.requestTrack, 'quick_response'),
          isNotNull(mosqueRequests.assignedTo)
        ),
        isNotNull(mosqueRequests.finalReportAssignedTo)
      ),
      sql`${mosqueRequests.currentStage} != 'closed'`,
      sql`${mosqueRequests.status} != 'rejected'`
    )
  );

  console.log(`Active Requests fetched: ${activeRequests.length}`);

  if (activeRequests.length === 0) {
    return { fieldVisits: [], quickResponses: [], finalReports: [] };
  }

  const requestIds = activeRequests.map(r => r.request.id);

  // Fetch all reports for these request IDs
  const fvReports = await db.select().from(fieldVisitReports).where(inArray(fieldVisitReports.requestId, requestIds));
  const qrReports = await db.select().from(quickResponseReports).where(inArray(quickResponseReports.requestId, requestIds));
  const fnReports = await db.select().from(finalReports).where(inArray(finalReports.requestId, requestIds));

  // Fetch all unique user IDs involved
  const userIds = new Set<number>();
  activeRequests.forEach(r => {
    if (r.request.fieldVisitAssignedTo) userIds.add(r.request.fieldVisitAssignedTo);
    if (r.request.assignedTo) userIds.add(r.request.assignedTo);
    if (r.request.finalReportAssignedTo) userIds.add(r.request.finalReportAssignedTo);
  });

  let usersList: any[] = [];
  if (userIds.size > 0) {
    usersList = await db.select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
    })
    .from(users)
    .where(inArray(users.id, Array.from(userIds)));
  }

  const userMap = new Map(usersList.map(u => [u.id, u]));
  const fvReportMap = new Set(fvReports.map(r => r.requestId));
  const qrReportMap = new Set(qrReports.map(r => r.requestId));
  const fnReportMap = new Set(fnReports.map(r => r.requestId));

  const pendingFieldVisits: any[] = [];
  const pendingQuickResponses: any[] = [];
  const pendingFinalReports: any[] = [];

  const now = new Date();

  activeRequests.forEach(({ request, mosque }) => {
    // 1. Check Field Visit Report
    if (request.fieldVisitAssignedTo && !fvReportMap.has(request.id) && request.currentStage === 'field_visit') {
      let isLate = false;
      if (request.fieldVisitScheduledDate) {
        const scheduledDate = new Date(request.fieldVisitScheduledDate);
        if (request.fieldVisitScheduledTime) {
          const [hours, minutes] = request.fieldVisitScheduledTime.split(':').map(Number);
          if (!isNaN(hours)) scheduledDate.setHours(hours, minutes || 0, 0, 0);
        }
        const limitDate = new Date(scheduledDate);
        limitDate.setDate(limitDate.getDate() + 2);
        isLate = now > limitDate;
      }

      pendingFieldVisits.push({
        id: request.id,
        requestNumber: request.requestNumber,
        mosqueName: mosque?.name || "مسجد غير محدد",
        assignedTo: userMap.get(request.fieldVisitAssignedTo) || null,
        scheduledDate: request.fieldVisitScheduledDate,
        isLate,
      });
    }

    // 2. Check Quick Response Report
    const isQuickResponseTrack = request.requestTrack === 'quick_response';
    if (isQuickResponseTrack && request.assignedTo && !qrReportMap.has(request.id) && request.currentStage === 'execution') {
      let isLate = false;
      if (request.quickResponseScheduledDate) {
        const scheduledDate = new Date(request.quickResponseScheduledDate);
        if (request.quickResponseScheduledTime) {
          const [hours, minutes] = request.quickResponseScheduledTime.split(':').map(Number);
          if (!isNaN(hours)) scheduledDate.setHours(hours, minutes || 0, 0, 0);
        }
        const limitDate = new Date(scheduledDate);
        limitDate.setDate(limitDate.getDate() + 2);
        isLate = now > limitDate;
      }

      pendingQuickResponses.push({
        id: request.id,
        requestNumber: request.requestNumber,
        mosqueName: mosque?.name || "مسجد غير محدد",
        assignedTo: userMap.get(request.assignedTo) || null,
        isLate,
      });
    }

    // 3. Check Corporate Communication Final Report
    if (request.finalReportAssignedTo && !fnReportMap.has(request.id)) {
      let isLate = false;
      if (request.finalReportScheduledDate) {
        const scheduledDate = new Date(request.finalReportScheduledDate);
        if (request.finalReportScheduledTime) {
          const [hours, minutes] = request.finalReportScheduledTime.split(':').map(Number);
          if (!isNaN(hours)) scheduledDate.setHours(hours, minutes || 0, 0, 0);
        }
        const limitDate = new Date(scheduledDate);
        limitDate.setDate(limitDate.getDate() + 2);
        isLate = now > limitDate;
      }

      pendingFinalReports.push({
        id: request.id,
        requestNumber: request.requestNumber,
        mosqueName: mosque?.name || "مسجد غير محدد",
        assignedTo: userMap.get(request.finalReportAssignedTo) || null,
        isLate,
      });
    }
  });

  return {
    fieldVisits: pendingFieldVisits,
    quickResponses: pendingQuickResponses,
    finalReports: pendingFinalReports,
  };
}

async function main() {
  try {
    const result = await getPendingReports();
    console.log("\n=== getPendingReports Output ===");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

main();
