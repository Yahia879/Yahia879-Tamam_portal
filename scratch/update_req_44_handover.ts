import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    process.exit(1);
  }

  // Update request 44 to handover stage
  await db.execute(sql`
    UPDATE mosque_requests 
    SET currentStage = 'handover', 
        status = 'in_progress',
        updatedAt = NOW()
    WHERE id = 44
  `);

  const [updated]: any = await db.execute(sql`SELECT id, requestNumber, currentStage, status, programType FROM mosque_requests WHERE id = 44`);
  console.log("Updated Request 44:", updated);

  process.exit(0);
}

main().catch(console.error);
