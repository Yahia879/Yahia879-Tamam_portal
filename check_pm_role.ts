import 'dotenv/config';
import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }
  
  const perms = await db.execute(sql`SELECT * FROM role_permissions WHERE role_id = 'project_manager'`);
  console.log('Project Manager Role Permissions:', JSON.stringify(perms[0], null, 2));
  
  process.exit(0);
})();
