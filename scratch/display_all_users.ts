import 'dotenv/config';
import { getDb } from '../server/db';
import { users } from '../drizzle/schema';
import { calculateUserPermissions } from '../server/permissions';
import { isNull } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }

  console.log("=== Displaying All Users, Roles, and requests.view_details ===");
  const allUsers = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(isNull(users.deletedAt));

  for (const u of allUsers) {
    const perms = await calculateUserPermissions(u.id);
    const hasViewDetails = perms.includes("requests.view_details");
    console.log(`User ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | Has requests.view_details: ${hasViewDetails}`);
  }

  process.exit(0);
})();
