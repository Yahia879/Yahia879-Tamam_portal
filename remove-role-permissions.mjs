import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in the environment.");
    process.exit(1);
  }

  console.log("🚀 Connecting to database to remove specific permissions from roles...");
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const roles = ['super_admin', 'system_admin', 'projects_office'];
    const permissionsToRemove = [
      'requests.manage_as_field_team',       // إدارة الطلبات كفريق ميداني
      'requests.manage_as_quick_response',  // إدارة الطلبات كفريق استجابة سريعة
      'requests.upload_final_report'        // رفع التقرير الختامي
    ];

    let deletedCount = 0;

    for (const roleId of roles) {
      // التحقق من وجود الدور أولاً
      const [existingRole] = await conn.execute(
        "SELECT id FROM roles WHERE id = ?",
        [roleId]
      );

      if (existingRole.length === 0) {
        console.log(`ℹ️ Role '${roleId}' does not exist in the database. Skipping.`);
        continue;
      }

      console.log(`Processing role: ${roleId}...`);

      for (const permId of permissionsToRemove) {
        // حذف الارتباط إن وجد
        const [result] = await conn.execute(
          "DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?",
          [roleId, permId]
        );

        if (result.affectedRows > 0) {
          console.log(`  🗑️ Removed permission '${permId}' from role '${roleId}'`);
          deletedCount += result.affectedRows;
        } else {
          console.log(`  Skip: Permission '${permId}' is not assigned to role '${roleId}'`);
        }
      }
    }

    console.log(`\n🎉 Process completed successfully! Total deleted assignments: ${deletedCount}`);
    console.log("No other permissions, roles, or users were affected.");

  } catch (error) {
    console.error("❌ Operation failed with error:", error);
  } finally {
    await conn.end();
  }
}

main();
