import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    process.exit(1);
  }

  // 1. Check current status
  const [before]: any = await db.execute(sql`SELECT id, requestNumber, currentStage, status FROM mosque_requests WHERE id = 44`);
  console.log("Before:", before);

  // 2. Set to handover
  await db.execute(sql`
    UPDATE mosque_requests 
    SET currentStage = 'handover', 
        status = 'in_progress',
        updatedAt = NOW()
    WHERE id = 44
  `);

  // 3. Check after
  const [after]: any = await db.execute(sql`SELECT id, requestNumber, currentStage, status FROM mosque_requests WHERE id = 44`);
  console.log("After:", after);

  process.exit(0);
}

main().catch(console.error);
