import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq, ne, and, isNull, sql, or } from "drizzle-orm";
import { calculateUserPermissions } from "../server/permissions";

async function debugUser68() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }

  // 1. Get user 68 details
  const [user68] = await db
    .select()
    .from(users)
    .where(eq(users.id, 68))
    .limit(1);

  if (!user68) {
    console.log("User 68 not found!");
    return;
  }

  console.log("--- User 68 Info ---");
  console.log("ID:", user68.id);
  console.log("Name:", user68.name);
  console.log("Role:", user68.role);
  console.log("Status:", user68.status);
  console.log("DeletedAt:", user68.deletedAt);

  // 2. Get permissions
  const permissions = await calculateUserPermissions(68);
  console.log("\n--- Permissions for User 68 ---");
  console.log("Total Permissions:", permissions.length);
  console.log("Has requests.view_details:", permissions.includes("requests.view_details"));
  console.log("Permissions List:", permissions);

  // 3. Test candidateUsers query
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

  console.log("\n--- Candidate Users ---");
  console.log("Candidates Count:", candidateUsers.length);
  const is68Candidate = candidateUsers.some(u => u.id === 68);
  console.log("Is User 68 in Candidates?", is68Candidate);

  // 4. Test officers retrieval logic
  const officerIds: number[] = [];
  const defaultOfficerRoles = ["super_admin", "system_admin", "projects_office"];

  for (const u of candidateUsers) {
    if (defaultOfficerRoles.includes(u.role)) {
      officerIds.push(u.id);
      continue;
    }

    const userPerms = await calculateUserPermissions(u.id);
    if (userPerms.includes("requests.view_details")) {
      officerIds.push(u.id);
    }
  }

  console.log("\n--- Resolved Officer IDs ---");
  console.log("Officer IDs:", officerIds);
  console.log("Is User 68 in Officers?", officerIds.includes(68));
}

debugUser68().catch(console.error);
