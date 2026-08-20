import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('No DB'); process.exit(1); }

  const [cols]: any = await db.execute(sql`DESCRIBE final_reports`);
  console.log('final_reports columns:', cols.map((c: any) => c.Field));

  const [fv]: any = await db.execute(sql`
    SELECT fvr.id, fvr.requestId, fvr.visitedBy, mr.fieldVisitAssignedTo, u.name as visitedByName
    FROM field_visit_reports fvr
    LEFT JOIN mosque_requests mr ON mr.id = fvr.requestId
    LEFT JOIN users u ON u.id = fvr.visitedBy
  `);
  console.log('Field Visit Reports and assignedTo:', fv);

  const [fn]: any = await db.execute(sql`
    SELECT fr.id, fr.requestId, mr.finalReportAssignedTo
    FROM final_reports fr
    LEFT JOIN mosque_requests mr ON mr.id = fr.requestId
  `);
  console.log('Final Reports and assignedTo:', fn);

  process.exit(0);
}
main().catch(console.error);
