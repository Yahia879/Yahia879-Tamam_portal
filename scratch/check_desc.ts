import 'dotenv/config';
import { getDb } from '../server/db';
import { roles, rolePermissions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }
  
  const allRoles = await db.select().from(roles);
  console.log("All Roles:", JSON.stringify(allRoles, null, 2));

  process.exit(0);
})();
