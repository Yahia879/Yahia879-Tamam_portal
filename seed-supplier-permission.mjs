import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { and, eq, inArray } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  console.log("🚀 Starting seed for supplier edit permission...");

  if (!process.env.DATABASE_URL) {
    console.error(
      "❌ Error: DATABASE_URL environment variable is not defined in .env file."
    );
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema, mode: "default" });

  try {
    // 1. Ensure the 'suppliers' module exists in the modules table
    console.log("Checking if 'suppliers' module exists...");
    await db
      .insert(schema.modules)
      .values({
        id: "suppliers",
        nameAr: "الموردين",
        nameEn: "Suppliers",
        icon: "Truck",
        displayOrder: 9,
      })
      .onDuplicateKeyUpdate({
        set: {
          nameAr: "الموردين",
          nameEn: "Suppliers",
          icon: "Truck",
          displayOrder: 9,
        },
      });

    // 2. Ensure the 'suppliers.edit' permission exists in the permissions table
    console.log("Checking if 'suppliers.edit' permission exists...");
    await db
      .insert(schema.permissions)
      .values({
        id: "suppliers.edit",
        moduleId: "suppliers",
        action: "edit",
        nameAr: "تعديل بيانات الموردين",
        nameEn: "Edit Supplier Data",
        description: "صلاحية تعديل بيانات الموردين",
      })
      .onDuplicateKeyUpdate({
        set: {
          nameAr: "تعديل بيانات الموردين",
          nameEn: "Edit Supplier Data",
          description: "صلاحية تعديل بيانات الموردين",
        },
      });

    // 3. Define target roles
    const targetRoles = [
      "super_admin",
      "system_admin",
      "projects_office",
      "financial",
    ];

    // 4. Fetch existing roles from database to prevent foreign key violations
    console.log("Verifying roles in the database...");
    const existingRoles = await db.select().from(schema.roles);
    const existingRoleIds = existingRoles.map(r => r.id);
    console.log(`Found roles: ${existingRoleIds.join(", ")}`);

    const validTargetRoles = targetRoles.filter(roleId => {
      if (!existingRoleIds.includes(roleId)) {
        console.warn(
          `⚠️ Warning: Role '${roleId}' does not exist in the roles table. Skipping relationship creation for this role.`
        );
        return false;
      }
      return true;
    });

    if (validTargetRoles.length === 0) {
      console.log(
        "No valid roles found to associate permissions with. Exiting."
      );
      return;
    }

    // 5. Query existing role-permission assignments for these roles
    const existingMappings = await db
      .select()
      .from(schema.rolePermissions)
      .where(
        and(
          eq(schema.rolePermissions.permissionId, "suppliers.edit"),
          inArray(schema.rolePermissions.roleId, validTargetRoles)
        )
      );

    const existingMappedRoles = new Set(existingMappings.map(m => m.roleId));

    // 6. Filter out roles that already have this permission assigned
    const toInsert = validTargetRoles
      .filter(roleId => !existingMappedRoles.has(roleId))
      .map(roleId => ({
        roleId,
        permissionId: "suppliers.edit",
      }));

    if (toInsert.length > 0) {
      console.log(
        `Adding 'suppliers.edit' permission to roles: ${toInsert.map(item => item.roleId).join(", ")}`
      );
      await db.insert(schema.rolePermissions).values(toInsert);
      console.log(
        "✅ Seed completed successfully! All mappings are now present."
      );
    } else {
      console.log(
        "✨ All target roles already possess the 'suppliers.edit' permission. No changes were made."
      );
    }
  } catch (error) {
    console.error("❌ Error running seed script:", error);
  } finally {
    await connection.end();
  }
}

run();
