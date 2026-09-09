import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const TARGET_ROLES = [
  { id: "super_admin", nameAr: "المدير العام" },
  { id: "system_admin", nameAr: "مدير النظام" },
  { id: "projects_office", nameAr: "مكتب المشاريع" },
  { id: "financial", nameAr: "الإدارة المالية" },
  { id: "general_manager", nameAr: "المدير التنفيذي" },
];

const NEW_PERMISSIONS = [
  {
    id: "projects.edit_support_and_fees",
    nameAr: "تعديل بيانات الداعمين والأجور الإدارية",
    nameEn: "Edit Sponsors and Admin Fees",
    moduleId: "projects",
    action: "edit_support_and_fees",
  },
  {
    id: "projects.add_receipt_voucher",
    nameAr: "إضافة سند صرف",
    nameEn: "Add Receipt Voucher",
    moduleId: "projects",
    action: "add_receipt_voucher",
  },
];

async function seed() {
  console.log("🌱 Starting seed script for new project permissions...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is missing!");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // 1. التأكد من وجود الصلاحيات في جدول permissions
    for (const perm of NEW_PERMISSIONS) {
      const [existing] = await connection.query(
        "SELECT * FROM `permissions` WHERE `id` = ?;",
        [perm.id]
      );

      if (existing.length === 0) {
        await connection.query(
          "INSERT INTO `permissions` (`id`, `name_ar`, `name_en`, `module_id`, `action`) VALUES (?, ?, ?, ?, ?);",
          [perm.id, perm.nameAr, perm.nameEn, perm.moduleId, perm.action]
        );
        console.log(`✅ Permission '${perm.id}' created.`);
      } else {
        await connection.query(
          "UPDATE `permissions` SET `name_ar` = ?, `name_en` = ?, `module_id` = ?, `action` = ? WHERE `id` = ?;",
          [perm.nameAr, perm.nameEn, perm.moduleId, perm.action, perm.id]
        );
        console.log(`ℹ️ Permission '${perm.id}' updated.`);
      }
    }

    // 2. إسناد الصلاحيات للأدوار الافتراضية المستهدفة
    for (const role of TARGET_ROLES) {
      for (const perm of NEW_PERMISSIONS) {
        const [existingRolePerm] = await connection.query(
          "SELECT * FROM `role_permissions` WHERE `role_id` = ? AND `permission_id` = ?;",
          [role.id, perm.id]
        );

        if (existingRolePerm.length === 0) {
          await connection.query(
            "INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (?, ?);",
            [role.id, perm.id]
          );
          console.log(`✅ Assigned '${perm.id}' to role '${role.id}'.`);
        } else {
          console.log(`ℹ️ Role '${role.id}' already has '${perm.id}'.`);
        }
      }
    }

    console.log("\n🎉 Seeding finished successfully!");
  } catch (error) {
    console.error("❌ Error running seed script:", error);
  } finally {
    await connection.end();
  }
}

seed().catch(console.error);
