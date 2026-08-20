import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    process.exit(1);
  }

  const [rows]: any = await db.execute(sql`SELECT * FROM mosque_requests WHERE id = 44`);
  console.log("Request 44 details:", rows[0]);

  process.exit(0);
}

main().catch(console.error);
