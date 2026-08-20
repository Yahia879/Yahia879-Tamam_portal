import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    process.exit(1);
  }
  await db.execute(sql`ALTER TABLE receipt_vouchers MODIFY COLUMN projectId INT NULL;`);
  console.log("Successfully altered receipt_vouchers.projectId to INT NULL");
  process.exit(0);
}

main().catch(console.error);
