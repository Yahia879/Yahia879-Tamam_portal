import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('No DB'); process.exit(1); }

  const [pm]: any = await db.execute(sql`SELECT * FROM project_mosques WHERE projectId = 25`);
  console.log('project_mosques for project 25:', pm);

  process.exit(0);
}
main().catch(console.error);
