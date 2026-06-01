import 'dotenv/config';
import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }
  
  const requesters = await db.execute(sql`SELECT id, name, role, status FROM users WHERE role = 'service_requester'`);
  console.log('Requesters in DB:', JSON.stringify(requesters[0], null, 2));

  const allCount = await db.execute(sql`SELECT role, COUNT(*) as cnt FROM users GROUP BY role`);
  console.log('User counts by role:', JSON.stringify(allCount[0], null, 2));
  
  process.exit(0);
})();
