import 'dotenv/config';
import { getDb } from '../server/db';
import { sql, eq, or, and, inArray } from 'drizzle-orm';
import { mosqueRequests, mosques, quickResponseReports, fieldVisitReports, finalReports, users } from '../drizzle/schema';

async function main() {
  const db = await getDb();
  if (!db) { console.log('No DB'); process.exit(1); }

  // 1. Fetch all requests that have reports or are assigned
  const allReqs = await db.select({
    request: mosqueRequests,
    mosque: mosques,
  })
  .from(mosqueRequests)
  .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
  .where(
    and(
      or(
        sql`${mosqueRequests.fieldVisitAssignedTo} IS NOT NULL`,
        and(
          eq(mosqueRequests.requestTrack, 'quick_response'),
          sql`${mosqueRequests.assignedTo} IS NOT NULL`
        ),
        sql`${mosqueRequests.finalReportAssignedTo} IS NOT NULL`,
        sql`EXISTS (SELECT 1 FROM quick_response_reports WHERE quick_response_reports.requestId = ${mosqueRequests.id})`,
        sql`EXISTS (SELECT 1 FROM field_visit_reports WHERE field_visit_reports.requestId = ${mosqueRequests.id})`,
        sql`EXISTS (SELECT 1 FROM final_reports WHERE final_reports.requestId = ${mosqueRequests.id})`
      ),
      sql`${mosqueRequests.status} != 'rejected'`
    )
  );

  console.log('Total matching requests:', allReqs.length);

  const qrReports = await db.select().from(quickResponseReports);
  const qrReportMap = new Set(qrReports.map(r => r.requestId));

  allReqs.forEach(({ request, mosque }) => {
    let pData: any = {};
    try {
      pData = typeof request.programData === 'string' ? JSON.parse(request.programData) : request.programData || {};
    } catch (e) {}

    const isQuickCreate = Boolean(
      pData?.isQuickCreate || 
      pData?.customMosqueName || 
      (request.requestTrack === 'quick_response' && request.currentStage === 'closed' && qrReportMap.has(request.id))
    );

    if (qrReportMap.has(request.id) || request.requestTrack === 'quick_response') {
      console.log(`Req #${request.id} (${request.requestNumber}): track=${request.requestTrack}, stage=${request.currentStage}, isQuickCreate=${isQuickCreate}, mosque=${pData.customMosqueName || mosque?.name}`);
    }
  });

  process.exit(0);
}

main().catch(console.error);
