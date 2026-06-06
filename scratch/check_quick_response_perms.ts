import 'dotenv/config';
import { getDb } from '../server/db';
import { users } from '../drizzle/schema';
import { inArray } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }

  console.log("=== Checking details of late users ===");
  const targetIds = [68, 69, 72, 74, 75, 76, 77];
  const list = await db
    .select({ id: users.id, name: users.name, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt })
    .from(users)
    .where(inArray(users.id, targetIds));
  
  console.log(JSON.stringify(list, null, 2));

  process.exit(0);
})();
