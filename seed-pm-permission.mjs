import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in the environment.");
    process.exit(1);
  }

  console.log("🚀 Connecting to database to seed 'Assign as Project Manager' permission...");
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const roleId = 'project_manager';
    const permissionId = 'projects.assign_as_manager';
    const moduleId = 'projects';

    // 1. التأكد من وجود الموديول 'projects'
    const [existingModule] = await conn.execute(
      "SELECT id FROM modules WHERE id = ?",
      [moduleId]
    );
    if (existingModule.length === 0) {
      await conn.execute(
        "INSERT INTO modules (id, name_ar, name_en, icon, display_order, is_active) VALUES ('projects', 'المشاريع', 'Projects', 'Folder', 5, true)"
      );
      console.log("✅ Created 'projects' module.");
    }

    // 2. التأكد من وجود صلاحية 'projects.assign_as_manager'
    const [existingPerm] = await conn.execute(
      "SELECT id FROM permissions WHERE id = ?",
      [permissionId]
    );
    if (existingPerm.length === 0) {
      await conn.execute(
        "INSERT INTO permissions (id, module_id, action, name_ar, name_en) VALUES (?, ?, ?, ?, ?)",
        [permissionId, moduleId, 'assign_as_manager', 'تعيين كمدير للمشاريع', 'Assign as Project Manager']
      );
      console.log(`✅ Created permission: ${permissionId}`);
    } else {
      console.log(`ℹ️ Permission '${permissionId}' already exists.`);
    }

    // 3. التحقق من وجود دور 'project_manager'
    const [existingRole] = await conn.execute(
      "SELECT id FROM roles WHERE id = ?",
      [roleId]
    );
    if (existingRole.length === 0) {
      console.log(`⚠️ Warning: Role '${roleId}' does not exist in the database. Creating role '${roleId}' first...`);
      await conn.execute(
        "INSERT INTO roles (id, name_ar, name_en, is_active) VALUES (?, 'مدير مشروع', 'Project Manager', true)",
        [roleId]
      );
      console.log(`✅ Created role: ${roleId}`);
    }

    // 4. إسناد الصلاحية للدور بشكل آمن (فقط إذا لم تكن مسندة مسبقاً)
    const [existingRolePerm] = await conn.execute(
      "SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?",
      [roleId, permissionId]
    );

    if (existingRolePerm.length === 0) {
      await conn.execute(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
        [roleId, permissionId]
      );
      console.log(`✅ Assigned permission '${permissionId}' to role '${roleId}'`);
    } else {
      console.log(`ℹ️ Skip: Permission '${permissionId}' is already assigned to role '${roleId}'`);
    }

    console.log("\n🎉 Seeding completed successfully and safely without affecting any other data!");

  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
  } finally {
    await conn.end();
  }
}

main();
