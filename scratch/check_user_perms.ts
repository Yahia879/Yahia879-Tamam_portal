import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import { calculateUserPermissions, checkPermission } from "../server/permissions.ts";
import { and, eq, inArray } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function checkUserPerms() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });

  try {
    const adminUsers = await db.select({
      id: schema.users.id,
      name: schema.users.name,
      role: schema.users.role,
    }).from(schema.users).where(inArray(schema.users.role, ["super_admin", "system_admin"]));

    console.log("Admin Users in DB:", adminUsers);
    
    for (const u of adminUsers) {
      console.log(`\n=========================================`);
      console.log(`User: ${u.name} (ID: ${u.id}, Role: ${u.role})`);
      
      const roles = await db.select().from(schema.userRoleAssignments)
        .where(eq(schema.userRoleAssignments.userId, u.id));
      console.log("Role Assignments:", roles);
      
      const customPerms = await db.select().from(schema.userPermissions)
        .where(eq(schema.userPermissions.userId, u.id));
      console.log("Custom User Permissions:", customPerms);

      const userPerms = await calculateUserPermissions(u.id);
      console.log("Has appointments.view_all:", userPerms.includes("appointments.view_all"));
      console.log("Has appointments.view_own:", userPerms.includes("appointments.view_own"));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkUserPerms().catch(console.error);
