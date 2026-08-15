import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in the environment.");
    process.exit(1);
  }

  console.log("🚀 Connecting to database to seed 'Create Quick Request' permission safely...");
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const permissionId = 'requests.create_quick_request';
    const moduleId = 'requests';
    const targetRoles = [
      { id: 'super_admin', nameAr: 'المدير العام', nameEn: 'Super Admin' },
      { id: 'system_admin', nameAr: 'مدير النظام', nameEn: 'System Admin' },
      { id: 'field_team', nameAr: 'الفريق الميداني', nameEn: 'Field Team' },
      { id: 'quick_response', nameAr: 'فريق الاستجابة السريعة', nameEn: 'Quick Response Team' },
    ];

    // 1. التأكد من وجود الموديول 'requests'
    const [existingModule] = await conn.execute(
      "SELECT id FROM modules WHERE id = ?",
      [moduleId]
    );
    if (existingModule.length === 0) {
      await conn.execute(
        "INSERT INTO modules (id, name_ar, name_en, icon, display_order, is_active) VALUES ('requests', 'الطلبات', 'Requests', 'ClipboardList', 3, true)"
      );
      console.log("✅ Created 'requests' module in modules table.");
    } else {
      console.log("ℹ️ Module 'requests' exists.");
    }

    // 2. التأكد من وجود صلاحية 'requests.create_quick_request'
    const [existingPerm] = await conn.execute(
      "SELECT id FROM permissions WHERE id = ?",
      [permissionId]
    );
    if (existingPerm.length === 0) {
      await conn.execute(
        "INSERT INTO permissions (id, module_id, action, name_ar, name_en, description) VALUES (?, ?, ?, ?, ?, ?)",
        [permissionId, moduleId, 'create_quick_request', 'إنشاء طلب سريع', 'Create Quick Request', 'صلاحية إنشاء وتقديم طلب خدمة سريع']
      );
      console.log(`✅ Created permission '${permissionId}' in permissions table.`);
    } else {
      // تحديث الاسم العربي والإنجليزي في حال وجودها
      await conn.execute(
        "UPDATE permissions SET name_ar = 'إنشاء طلب سريع', name_en = 'Create Quick Request' WHERE id = ?",
        [permissionId]
      );
      console.log(`ℹ️ Permission '${permissionId}' exists and is updated.`);
    }

    // 3. التحقق من الأدوار وإسناد الصلاحية لكل دور بشكل آمن دون التأثير على أي بيانات أخرى
    for (const role of targetRoles) {
      // التأكد من وجود الدور
      const [existingRole] = await conn.execute(
        "SELECT id FROM roles WHERE id = ?",
        [role.id]
      );
      if (existingRole.length === 0) {
        console.log(`⚠️ Role '${role.id}' not found, creating it...`);
        await conn.execute(
          "INSERT INTO roles (id, name_ar, name_en, is_system, is_active) VALUES (?, ?, ?, true, true)",
          [role.id, role.nameAr, role.nameEn]
        );
        console.log(`✅ Created role '${role.id}'.`);
      }

      // إسناد الصلاحية للدور إذا لم تكن موجودة مسبقاً
      const [existingRolePerm] = await conn.execute(
        "SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?",
        [role.id, permissionId]
      );

      if (existingRolePerm.length === 0) {
        await conn.execute(
          "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
          [role.id, permissionId]
        );
        console.log(`✅ Assigned permission '${permissionId}' to role '${role.id}'.`);
      } else {
        console.log(`ℹ️ Permission '${permissionId}' is already assigned to role '${role.id}'.`);
      }
    }

    console.log("\n🎉 Seeding completed successfully and safely without affecting any existing server data!");

  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
