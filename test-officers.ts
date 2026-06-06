import "dotenv/config";
import { getDb } from "./server/db";
import { users } from "./drizzle/schema";
import { calculateUserPermissions } from "./server/permissions";
import { isNull, or, and, ne, sql, eq } from "drizzle-orm";

async function getRequestOfficerIds(db: any, excludeUserId?: number): Promise<number[]> {
  try {
    const candidateUsers = await db
      .select({ id: users.id, role: users.role })
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

    console.log("Candidate Users count:", candidateUsers.length);
    const officerIds: number[] = [];
    const defaultOfficerRoles = ["super_admin", "system_admin", "projects_office"];

    for (const u of candidateUsers) {
      if (excludeUserId && u.id === excludeUserId) continue;

      if (defaultOfficerRoles.includes(u.role)) {
        officerIds.push(u.id);
        continue;
      }

      const userPerms = await calculateUserPermissions(u.id);
      if (u.id === 68) {
        console.log("User 68 Permissions:", userPerms);
        console.log("User 68 role:", u.role);
      }
      if (userPerms.includes("requests.view_details")) {
        officerIds.push(u.id);
      }
    }

    return officerIds;
  } catch (error) {
    console.error("Error in getRequestOfficerIds:", error);
    return [];
  }
}

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to get DB");
    return;
  }
  console.log("Testing officers...");
  const officers = await getRequestOfficerIds(db);
  console.log("Officers:", officers);
  process.exit(0);
}

run();
