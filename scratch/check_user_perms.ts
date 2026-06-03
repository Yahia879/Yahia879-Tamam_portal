import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import { calculateUserPermissions } from "../server/permissions.ts";
import * as dotenv from "dotenv";

dotenv.config();

async function checkUserPerms() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });

  try {
    const rolesToCheck = ["financial"];
    for (const roleId of rolesToCheck) {
      console.log(`\n=========================================`);
      console.log(`Role: ${roleId}`);
      
      const perms = await db.select().from(schema.rolePermissions)
        .where(eq(schema.rolePermissions.roleId, roleId));
      
      const permIds = perms.map(p => p.permissionId);
      console.log("Total permissions count:", permIds.length);
      console.log("Permissions List:", permIds.sort());
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkUserPerms().catch(console.error);
