import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in the environment.");
    process.exit(1);
  }

  console.log("🚀 Connecting to database to seed BOQ permissions for roles...");
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const rolesToSeed = ['super_admin', 'system_admin', 'projects_office'];
    const permissionsToSeed = ['boq.add', 'boq.edit', 'boq.delete'];

    // 1. التأكد من وجود الصلاحيات والـ Module في قاعدة البيانات أولاً لتفادي أخطاء المفاتيح الأجنبية
    const [existingModule] = await conn.execute(
      "SELECT id FROM modules WHERE id = 'boq'"
    );
    if (existingModule.length === 0) {
      await conn.execute(
        "INSERT INTO modules (id, name_ar, name_en, icon, display_order, is_active) VALUES ('boq', 'إعداد جداول الكميات', 'BOQ Preparation', 'FileSpreadsheet', 10, true)"
      );
      console.log("✅ Created 'boq' module.");
    }

    const permsInfo = [
      { id: 'boq.add', nameAr: 'إضافة بند جديد', nameEn: 'Add BOQ Item', action: 'add' },
      { id: 'boq.edit', nameAr: 'تعديل البنود', nameEn: 'Edit BOQ Items', action: 'edit' },
      { id: 'boq.delete', nameAr: 'حذف البنود', nameEn: 'Delete BOQ Items', action: 'delete' }
    ];

    for (const perm of permsInfo) {
      const [existingPerm] = await conn.execute(
        "SELECT id FROM permissions WHERE id = ?",
        [perm.id]
      );
      if (existingPerm.length === 0) {
        await conn.execute(
          "INSERT INTO permissions (id, module_id, action, name_ar, name_en) VALUES (?, 'boq', ?, ?, ?)",
          [perm.id, perm.action, perm.nameAr, perm.nameEn]
        );
        console.log(`✅ Created permission: ${perm.id}`);
      }
    }

    // 2. إسناد الصلاحيات للأدوار المحددة فقط بشكل آمن
    for (const roleId of rolesToSeed) {
      console.log(`\nProcessing permissions for role: ${roleId}...`);

      // التحقق من وجود الدور في جدول الأدوار أولاً
      const [existingRole] = await conn.execute(
        "SELECT id FROM roles WHERE id = ?",
        [roleId]
      );

      if (existingRole.length === 0) {
        console.log(`⚠️ Warning: Role '${roleId}' does not exist in the database. Skipping.`);
        continue;
      }

      for (const permId of permissionsToSeed) {
        const [existingRolePerm] = await conn.execute(
          "SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?",
          [roleId, permId]
        );

        if (existingRolePerm.length === 0) {
          await conn.execute(
            "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
            [roleId, permId]
          );
          console.log(`  ➕ Assigned permission '${permId}' to role '${roleId}'`);
        } else {
          console.log(`  Skip: Permission '${permId}' is already assigned to role '${roleId}'`);
        }
      }
    }

    console.log("\n🎉 Seeding BOQ permissions completed successfully and safely!");

  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
  } finally {
    await conn.end();
  }
}

main();
