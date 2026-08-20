import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('No DB'); process.exit(1); }

  const [qrReqs]: any = await db.execute(sql`
    SELECT id, requestNumber, programType, currentStage, status, requestTrack, programData, createdAt 
    FROM mosque_requests 
    WHERE requestTrack = 'quick_response'
    ORDER BY id DESC LIMIT 10
  `);
  console.log('Quick Response Requests in DB:', qrReqs);

  const [qrReports]: any = await db.execute(sql`
    SELECT id, requestId, respondedBy, responseDate, technicianName, resolved, status 
    FROM quick_response_reports 
    ORDER BY id DESC LIMIT 10
  `);
  console.log('Quick Response Reports in DB:', qrReports);

  const [history]: any = await db.execute(sql`
    SELECT id, requestId, action, notes, createdAt 
    FROM request_history 
    WHERE notes LIKE '%سريع%' OR action LIKE '%quick%'
    ORDER BY id DESC LIMIT 10
  `);
  console.log('Quick Request History in DB:', history);

  process.exit(0);
}
main().catch(console.error);
