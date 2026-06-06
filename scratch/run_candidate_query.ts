import 'dotenv/config';
import { getDb } from '../server/db';
import { users } from '../drizzle/schema';
import { and, isNull, or, ne, sql } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }

  console.log("=== Running Candidate Users Query ===");
  const candidateUsers = await db
    .select({ id: users.id, role: users.role, name: users.name })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        or(
          ne(users.role, "service_requester"),
          sql`exists (select 1 from user_roles where user_roles.user_id = ${users.id})`,
          sql`exists (select 1 from user_permissions where user_permissions.user_id = ${users.id})`
        )
      )
    );

  console.log(`Found ${candidateUsers.length} candidate users:`);
  console.log(JSON.stringify(candidateUsers, null, 2));

  process.exit(0);
})();
