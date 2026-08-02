import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const TARGET_ROLES = [
  { id: "super_admin", nameAr: "المدير العام", nameEn: "Super Admin" },
  { id: "system_admin", nameAr: "مدير النظام", nameEn: "System Admin" },
  { id: "projects_office", nameAr: "مكتب المشاريع", nameEn: "Projects Office" },
  { id: "financial", nameAr: "الإدارة المالية", nameEn: "Financial Department" },
  { id: "general_manager", nameAr: "المدير التنفيذي", nameEn: "Executive Director / General Manager" },
];

const PERMISSION = {
  id: "projects.financials",
  nameAr: "مالية المشاريع",
  nameEn: "Project Financials",
  moduleId: "projects",
  action: "financials",
};

async function seed() {
  console.log("🌱 Starting seed script for 'مالية المشاريع' (projects.financials)...");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is missing!");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // 1. التأكد من وجود الموديول 'projects'
    const [modules] = await connection.query("SELECT * FROM `modules` WHERE `id` = ?;", ["projects"]);
    if (modules.length === 0) {
      console.log("Creating module 'projects'...");
      await connection.query(
        "INSERT INTO `modules` (`id`, `name_ar`, `name_en`) VALUES (?, ?, ?);",
        ["projects", "المشاريع", "Projects"]
      );
    }

    // 2. التأكد من وجود الصلاحية في جدول permissions
    const [existingPerm] = await connection.query(
      "SELECT * FROM `permissions` WHERE `id` = ?;",
      [PERMISSION.id]
    );

    if (existingPerm.length === 0) {
      console.log(` Inserting permission '${PERMISSION.id}' into permissions table...`);
      await connection.query(
        "INSERT INTO `permissions` (`id`, `name_ar`, `name_en`, `module_id`, `action`) VALUES (?, ?, ?, ?, ?);",
        [PERMISSION.id, PERMISSION.nameAr, PERMISSION.nameEn, PERMISSION.moduleId, PERMISSION.action]
      );
      console.log(`✅ Permission '${PERMISSION.id}' created.`);
    } else {
      console.log(`ℹ️ Permission '${PERMISSION.id}' already exists in permissions table.`);
    }

    // 3. التأكد من وجود الأدوار في جدول roles وربط الصلاحية بها
    for (const role of TARGET_ROLES) {
      // التأكد من وجود الدور
      const [existingRole] = await connection.query(
        "SELECT * FROM `roles` WHERE `id` = ?;",
        [role.id]
      );

      if (existingRole.length === 0) {
        console.log(` Creating role '${role.id}' (${role.nameAr})...`);
        await connection.query(
          "INSERT INTO `roles` (`id`, `name_ar`, `name_en`, `is_system`, `is_active`) VALUES (?, ?, ?, 1, 1);",
          [role.id, role.nameAr, role.nameEn]
        );
      }

      // ربط الصلاحية بالدور في role_permissions
      const [existingRolePerm] = await connection.query(
        "SELECT * FROM `role_permissions` WHERE `role_id` = ? AND `permission_id` = ?;",
        [role.id, PERMISSION.id]
      );

      if (existingRolePerm.length === 0) {
        await connection.query(
          "INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (?, ?);",
          [role.id, PERMISSION.id]
        );
        console.log(`✅ Assigned '${PERMISSION.id}' to role '${role.id}' (${role.nameAr}).`);
      } else {
        console.log(`ℹ️ Role '${role.id}' already has permission '${PERMISSION.id}'.`);
      }
    }

    console.log("\n🎉 Seeding completed successfully for all target roles!");

  } catch (error) {
    console.error("❌ Error running seed script:", error);
  } finally {
    await connection.end();
  }
}

seed().catch(console.error);
