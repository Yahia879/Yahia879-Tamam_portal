import "dotenv/config";
import { getDb } from "../server/db";
import { users, userRoleAssignments } from "../drizzle/schema";
import { isNull, eq, and, sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    process.exit(1);
  }

  try {
    console.log("=== Querying users with primary role 'field_team' ===");
    const usersWithPrimaryRole = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        receiveRequestNotifications: users.receiveRequestNotifications,
        receiveRequestEmail: users.receiveRequestEmail,
      })
      .from(users)
      .where(and(eq(users.role, "field_team"), isNull(users.deletedAt)));

    console.log("Primary role field_team users:", JSON.stringify(usersWithPrimaryRole, null, 2));

    console.log("\n=== Querying users with assigned role 'field_team' via user_roles ===");
    const usersWithAssignedRole = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        receiveRequestNotifications: users.receiveRequestNotifications,
        receiveRequestEmail: users.receiveRequestEmail,
        assignedRoleId: userRoleAssignments.roleId,
      })
      .from(userRoleAssignments)
      .innerJoin(users, eq(userRoleAssignments.userId, users.id))
      .where(and(eq(userRoleAssignments.roleId, "field_team"), isNull(users.deletedAt)));

    console.log("Assigned role field_team users:", JSON.stringify(usersWithAssignedRole, null, 2));
  } catch (err) {
    console.error("Error executing query:", err);
  }
  process.exit(0);
}

main();
