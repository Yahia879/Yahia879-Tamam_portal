import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    process.exit(1);
  }

  const [before]: any = await db.execute(sql`SELECT id, requestNumber, currentStage, status FROM mosque_requests WHERE id = 49`);
  console.log("Before Request 49:", before);

  // 1. Update request 49 to handover
  await db.execute(sql`
    UPDATE mosque_requests 
    SET currentStage = 'handover', 
        status = 'in_progress',
        isEvaluated = false,
        satisfactionRating = NULL,
        evaluatedAt = NULL,
        completedAt = NULL,
        updatedAt = NOW()
    WHERE id = 49
  `);

  const [after]: any = await db.execute(sql`SELECT id, requestNumber, currentStage, status FROM mosque_requests WHERE id = 49`);
  console.log("Updated Request 49:", after);

  process.exit(0);
}

main().catch(console.error);
