import 'dotenv/config';
import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }
  
  console.log("=== Checking permissions in DB ===");
  const [perms] = await db.execute(sql`SELECT * FROM permissions WHERE id LIKE 'staff%'`);
  console.log('Staff permissions in DB:', JSON.stringify(perms, null, 2));

  console.log("\n=== Checking role assignments in DB ===");
  const [roleAssignments] = await db.execute(sql`SELECT * FROM role_permissions WHERE permission_id LIKE 'staff%'`);
  console.log('Role assignments in DB:', JSON.stringify(roleAssignments, null, 2));

  process.exit(0);
})();
