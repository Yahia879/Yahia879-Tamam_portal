import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in environment variables.");
    process.exit(1);
  }

  console.log("🔌 Connecting to database...");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema, mode: "default" });

  try {
    const permissionId = "disbursement_orders.create_direct";

    console.log(`Checking if permission "${permissionId}" exists...`);
    
    // 1. Check/Insert permission in permissions table
    const [existingPerm] = await db
      .select()
      .from(schema.permissions)
      .where(eq(schema.permissions.id, permissionId))
      .limit(1);

    if (!existingPerm) {
      console.log(`Inserting permission "${permissionId}"...`);
      await db.insert(schema.permissions).values({
        id: permissionId,
        moduleId: "disbursements",
        action: "create_direct",
        nameAr: "انشاء امر صرف مخصص",
        nameEn: "Create Direct Disbursement Order"
      });
      console.log("✔ Permission inserted successfully.");
    } else {
      console.log(`✔ Permission "${permissionId}" already exists.`);
    }

    // 2. Assign permission to roles: super_admin, system_admin, projects_office, financial
    const targetRoles = ["super_admin", "system_admin", "projects_office", "financial"];

    for (const roleId of targetRoles) {
      console.log(`Checking role assignment for role: "${roleId}"...`);
      
      const [existingAssignment] = await db
        .select()
        .from(schema.rolePermissions)
        .where(
          and(
            eq(schema.rolePermissions.roleId, roleId),
            eq(schema.rolePermissions.permissionId, permissionId)
          )
        )
        .limit(1);

      if (!existingAssignment) {
        console.log(`Assigning permission to role: "${roleId}"...`);
        await db.insert(schema.rolePermissions).values({
          roleId,
          permissionId
        });
        console.log(`✔ Assigned successfully to role: "${roleId}".`);
      } else {
        console.log(`✔ Role: "${roleId}" already has this permission.`);
      }
    }

    console.log("🎉 Seed finished successfully! No other data was modified.");

  } catch (error) {
    console.error("❌ Seed failed with error:", error);
  } finally {
    await connection.end();
  }
}

run();
