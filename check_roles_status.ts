import 'dotenv/config';
import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }
  
  const [rolesList] = await db.execute(sql`SELECT id, name_ar, is_system, is_active FROM roles`);
  console.log('Roles list in DB:', JSON.stringify(rolesList, null, 2));

  process.exit(0);
})();
