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

    let deletedTableCount = 0;
    let updatedJsonCount = 0;

    for (const roleId of roles) {
      // 1. التحقق من وجود الدور وجلب الحقل description
      const [existingRoleRows] = await conn.execute(
        "SELECT id, description FROM roles WHERE id = ?",
        [roleId]
      );

      if (existingRoleRows.length === 0) {
        console.log(`ℹ️ Role '${roleId}' does not exist in the database. Skipping.`);
        continue;
      }

      const roleRow = existingRoleRows[0];
      console.log(`\nProcessing role: ${roleId}...`);

      // 2. حذف الصلاحيات من جدول role_permissions
      for (const permId of permissionsToRemove) {
        const [result] = await conn.execute(
          "DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?",
          [roleId, permId]
        );

        if (result.affectedRows > 0) {
          console.log(`  🗑️ Removed from role_permissions: '${permId}'`);
          deletedTableCount += result.affectedRows;
        }
      }

      // 3. تعديل الصلاحيات المخزنة داخل حقل description (الذي يحفظ الصلاحيات كـ JSON array)
      if (roleRow.description) {
        try {
          const parsed = JSON.parse(roleRow.description);
          if (Array.isArray(parsed)) {
            // تصفية الصلاحيات لإزالة المستبعدة منها
            const filteredPerms = parsed.filter(p => !permissionsToRemove.includes(p));
            
            if (filteredPerms.length !== parsed.length) {
              const updatedJson = JSON.stringify(filteredPerms);
              await conn.execute(
                "UPDATE roles SET description = ? WHERE id = ?",
                [updatedJson, roleId]
              );
              console.log(`  📝 Cleaned permissions in roles.description JSON array.`);
              updatedJsonCount++;
            } else {
              console.log(`  ℹ️ No matching permissions found in roles.description JSON array.`);
            }
          }
        } catch (e) {
          console.log(`  ⚠️ Failed to parse/update description JSON for role '${roleId}':`, e.message);
        }
      }
    }

    console.log(`\n🎉 Process completed successfully!`);
    console.log(` - Table rows deleted: ${deletedTableCount}`);
    console.log(` - Role descriptions updated: ${updatedJsonCount}`);
    console.log("No other permissions, roles, or users were affected.");

  } catch (error) {
    console.error("❌ Operation failed with error:", error);
  } finally {
    await conn.end();
  }
}

main();
