import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    process.exit(1);
  }
  const [cols]: any = await db.execute(sql`SHOW COLUMNS FROM receipt_vouchers`);
  console.log("Columns:", JSON.stringify(cols, null, 2));
  process.exit(0);
}

main().catch(console.error);
