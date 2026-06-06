import 'dotenv/config';
import { getDb } from '../server/db';
import { userRoleAssignments } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }

  console.log("=== Checking User 68 roles in user_roles table ===");
  const rolesList = await db
    .select()
    .from(userRoleAssignments)
    .where(eq(userRoleAssignments.userId, 68));
  
  console.log(JSON.stringify(rolesList, null, 2));

  process.exit(0);
})();
