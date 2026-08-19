import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";
import { and, eq, inArray } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  console.log("=================================================================");
  console.log("🚀 Starting seed for project & project reports permissions...");
  console.log("=================================================================");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL environment variable is not defined in .env file.");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { schema, mode: "default" });

  try {
    // 1. Ensure 'projects' and 'reports' modules exist
    console.log("⏳ 1. Checking if modules exist...");
    await db
      .insert(schema.modules)
      .values([
        {
          id: "projects",
          nameAr: "المشاريع",
          nameEn: "Projects",
          icon: "FolderKanban",
          displayOrder: 2,
        },
        {
          id: "reports",
          nameAr: "التقارير",
          nameEn: "Reports",
          icon: "BarChart3",
          displayOrder: 5,
        }
      ])
      .onDuplicateKeyUpdate({
        set: {
          nameAr: schema.modules.nameAr,
          nameEn: schema.modules.nameEn,
          icon: schema.modules.icon,
          displayOrder: schema.modules.displayOrder,
        },
      });
    console.log("   ✅ Modules verified.");

    // 2. Ensure permissions exist in permissions table
    console.log("⏳ 2. Ensuring the 3 permissions exist...");
    const perms = [
      {
        id: "projects.create_multi_mosque",
        moduleId: "projects",
        action: "create_multi_mosque",
        nameAr: "إضافة مشروع لعدة مساجد",
        nameEn: "Create Multi-Mosque Project",
        description: "صلاحية إنشاء مشروع واحد مخصص لأكثر من مسجد في نفس الوقت",
      },
      {
        id: "project_reports.view",
        moduleId: "reports",
        action: "view",
        nameAr: "عرض تقارير المشاريع",
        nameEn: "View Project Reports",
        description: "صلاحية عرض مركز تقارير المشاريع والإحصائيات والاطلاع على التقارير وطباعتها",
      },
      {
        id: "project_reports.create",
        moduleId: "reports",
        action: "create",
        nameAr: "إنشاء تقارير مشاريع",
        nameEn: "Create Project Reports",
        description: "صلاحية إنشاء تقارير جديدة وتعديلها وإكمال المسودات وتغيير حالة تقارير المشاريع",
      }
    ];

    for (const p of perms) {
      await db
        .insert(schema.permissions)
        .values(p)
        .onDuplicateKeyUpdate({
          set: {
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            description: p.description,
            moduleId: p.moduleId,
            action: p.action,
          },
        });
      console.log(`   ✅ Permission ready: ${p.nameAr} (${p.id})`);
    }

    // 3. Define target roles
    const targetRoles = [
      "super_admin",
      "system_admin",
      "projects_office",
    ];

    console.log("\n⏳ 3. Verifying roles in the database...");
    const existingRoles = await db.select().from(schema.roles);
    const existingRoleIds = existingRoles.map(r => r.id);
    console.log(`Found roles: ${existingRoleIds.join(", ")}`);

    const validTargetRoles = targetRoles.filter(roleId => {
      if (!existingRoleIds.includes(roleId)) {
        console.warn(
          `⚠️ Warning: Role '${roleId}' does not exist in the roles table. Skipping.`
        );
        return false;
      }
      return true;
    });

    if (validTargetRoles.length === 0) {
      console.log("No valid roles found. Exiting.");
      return;
    }

    // 4. Assign permissions to the target roles in role_permissions table
    console.log("\n⏳ 4. Assigning permissions to roles...");
    const permIds = perms.map(p => p.id);

    for (const permId of permIds) {
      const existingMappings = await db
        .select()
        .from(schema.rolePermissions)
        .where(
          and(
            eq(schema.rolePermissions.permissionId, permId),
            inArray(schema.rolePermissions.roleId, validTargetRoles)
          )
        );

      const existingMappedRoles = new Set(existingMappings.map(m => m.roleId));

      const toInsert = validTargetRoles
        .filter(roleId => !existingMappedRoles.has(roleId))
        .map(roleId => ({
          roleId,
          permissionId: permId,
        }));

      if (toInsert.length > 0) {
        console.log(
          `   Adding '${permId}' to roles: ${toInsert.map(item => item.roleId).join(", ")}`
        );
        await db.insert(schema.rolePermissions).values(toInsert);
      } else {
        console.log(
          `   ✨ All target roles already possess '${permId}'.`
        );
      }
    }

    // 5. Update JSON description for projects_office if it exists
    const [allPoPerms] = await connection.query(
      "SELECT DISTINCT `permission_id` FROM `role_permissions` WHERE `role_id` = 'projects_office'"
    );
    if (allPoPerms && allPoPerms.length > 0) {
      const permsList = allPoPerms.map(r => r.permission_id);
      await connection.query(
        "UPDATE `roles` SET `description` = ? WHERE `id` = 'projects_office' AND `description` IS NOT NULL",
        [JSON.stringify(permsList)]
      );
      console.log("   ✅ Updated projects_office role JSON description.");
    }

    console.log("\n=================================================================");
    console.log("🎉 Seed finished successfully! Permissions assigned to roles.");
    console.log("=================================================================");
  } catch (error) {
    console.error("❌ Error running seed script:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
