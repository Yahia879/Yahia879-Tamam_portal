import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    process.exit(1);
  }

  // Check if project exists for request 44
  const [projs]: any = await db.execute(sql`SELECT * FROM projects WHERE requestId = 44`);
  console.log("Projects for request 44:", projs);

  // Check contracts
  const [contracts]: any = await db.execute(sql`SELECT * FROM contracts WHERE requestId = 44`);
  console.log("Contracts for request 44:", contracts);

  process.exit(0);
}

main().catch(console.error);
