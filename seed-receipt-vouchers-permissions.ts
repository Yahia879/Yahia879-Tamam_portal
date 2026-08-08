import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { eq, and, inArray } from "drizzle-orm";
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
    console.log("🚀 Starting Receipt Vouchers permissions seed...\n");

    // 1. Define required permissions
    const permissionsToEnsure = [
      {
        id: "receipt_vouchers.view",
        moduleId: "disbursements",
        action: "view",
        nameAr: "عرض سندات القبض",
        nameEn: "View Receipt Vouchers",
      },
      {
        id: "receipt_vouchers.edit",
        moduleId: "disbursements",
        action: "edit",
        nameAr: "تعديل سند القبض",
        nameEn: "Edit Receipt Voucher",
      },
      {
        id: "receipt_vouchers",
        moduleId: "disbursements",
        action: "manage",
        nameAr: "سندات القبض",
        nameEn: "Receipt Vouchers",
      },
    ];

    // Check & Insert permissions into permissions table
    for (const perm of permissionsToEnsure) {
      const [existingPerm] = await db
        .select()
        .from(schema.permissions)
        .where(eq(schema.permissions.id, perm.id))
        .limit(1);

      if (!existingPerm) {
        console.log(`➕ Inserting permission "${perm.id}" into permissions table...`);
        await db.insert(schema.permissions).values(perm);
        console.log(`  ✔ Permission "${perm.id}" inserted.`);
      } else {
        console.log(`  ℹ Permission "${perm.id}" already exists in permissions table.`);
      }
    }

    console.log("\n----------------------------------------\n");

    // 2. Target Roles
    const targetRoles = [
      "super_admin",
      "system_admin",
      "projects_office",
      "financial",
      "financial_manager",
    ];

    const permIdsToAssign = permissionsToEnsure.map((p) => p.id);

    // Assign permissions to target roles (in rolePermissions table)
    for (const roleId of targetRoles) {
      console.log(`🔑 Processing role: "${roleId}"...`);

      for (const permId of permIdsToAssign) {
        const [existingAssignment] = await db
          .select()
          .from(schema.rolePermissions)
          .where(
            and(
              eq(schema.rolePermissions.roleId, roleId),
              eq(schema.rolePermissions.permissionId, permId)
            )
          )
          .limit(1);

        if (!existingAssignment) {
          await db.insert(schema.rolePermissions).values({
            roleId,
            permissionId: permId,
          });
          console.log(`  ✔ Assigned "${permId}" to role "${roleId}".`);
        } else {
          console.log(`  ℹ Role "${roleId}" already has "${permId}".`);
        }
      }
    }

    console.log("\n----------------------------------------\n");

    // 3. Assign permissions directly to active users matching target roles
    console.log("👥 Checking users matching target roles...");
    const targetUsers = await db
      .select({ id: schema.users.id, name: schema.users.name, role: schema.users.role })
      .from(schema.users)
      .where(inArray(schema.users.role, targetRoles as any));

    console.log(`Found ${targetUsers.length} user(s) with target roles.`);

    for (const user of targetUsers) {
      console.log(`👤 Processing user ID: ${user.id} (${user.name} - ${user.role})...`);

      for (const permId of permIdsToAssign) {
        const [existingUserPerm] = await db
          .select()
          .from(schema.userPermissions)
          .where(
            and(
              eq(schema.userPermissions.userId, user.id),
              eq(schema.userPermissions.permissionId, permId)
            )
          )
          .limit(1);

        if (!existingUserPerm) {
          await db.insert(schema.userPermissions).values({
            userId: user.id,
            permissionId: permId,
          });
          console.log(`  ✔ Granted "${permId}" to user ID ${user.id}.`);
        } else {
          console.log(`  ℹ User ID ${user.id} already has "${permId}".`);
        }
      }
    }

    console.log("\n🎉 Seed completed successfully without affecting any existing server data!");
  } catch (error) {
    console.error("❌ Seed failed with error:", error);
  } finally {
    await connection.end();
  }
}

run();
