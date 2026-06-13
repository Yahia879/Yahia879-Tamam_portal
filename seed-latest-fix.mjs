import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { and, eq, inArray } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

async function seedLatestFix() {
  console.log("🚀 Running minimal seed script for latest permissions fixes...");

  try {
    // 1. Ensure the new fine-grained disbursement permissions exist in the permissions table
    const customPerms = [
      { id: "disbursements.view", moduleId: "disbursements", action: "view", nameAr: "عرض طلبات الصرف", nameEn: "View Disbursement Requests" },
      { id: "disbursements.create", moduleId: "disbursements", action: "create", nameAr: "إنشاء طلبات الصرف", nameEn: "Create Disbursement Requests" },
      { id: "disbursements.edit", moduleId: "disbursements", action: "edit", nameAr: "تعديل طلبات الصرف", nameEn: "Edit Disbursement Requests" },
      { id: "disbursements.approve", moduleId: "disbursements", action: "approve", nameAr: "اعتماد طلبات الصرف", nameEn: "Approve Disbursement Requests" },
    ];

    for (const perm of customPerms) {
      const [existing] = await db
        .select()
        .from(schema.permissions)
        .where(eq(schema.permissions.id, perm.id))
        .limit(1);

      if (!existing) {
        await db.insert(schema.permissions).values(perm);
        console.log(`✅ Added permission to database: ${perm.id}`);
      } else {
        await db
          .update(schema.permissions)
          .set({
            nameAr: perm.nameAr,
            nameEn: perm.nameEn,
            moduleId: perm.moduleId,
            action: perm.action
          })
          .where(eq(schema.permissions.id, perm.id));
        console.log(`🔄 Updated permission definition: ${perm.id}`);
      }
    }

    // 2. Remove "projects.view" permission from the "financial" role (to hide Projects tab from sidebar)
    const deleted = await db
      .delete(schema.rolePermissions)
      .where(
        and(
          eq(schema.rolePermissions.roleId, "financial"),
          eq(schema.rolePermissions.permissionId, "projects.view")
        )
      );
    console.log("🧹 Removed 'projects.view' permission from 'financial' role.");

    // 3. Assign the new disbursement permissions to the relevant roles (financial, financial_manager, projects_office)
    const targetRoles = ["financial", "financial_manager", "projects_office"];
    const permsToAssign = ["disbursements.view", "disbursements.create", "disbursements.edit", "disbursements.approve"];

    for (const roleId of targetRoles) {
      for (const permissionId of permsToAssign) {
        const [existing] = await db
          .select()
          .from(schema.rolePermissions)
          .where(
            and(
              eq(schema.rolePermissions.roleId, roleId),
              eq(schema.rolePermissions.permissionId, permissionId)
            )
          )
          .limit(1);

        if (!existing) {
          await db.insert(schema.rolePermissions).values({ roleId, permissionId });
          console.log(`🔗 Assigned permission '${permissionId}' to role '${roleId}'`);
        }
      }
    }

    console.log("🎉 Seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error running minimal seed script:", error);
  } finally {
    await connection.end();
  }
}

seedLatestFix();
