import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Checking and adding requests.upload_final_report permission to corporate_comm role...");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    // 1. Ensure the permission exists in permissions table
    const [existingPerms] = await connection.query(
      "SELECT * FROM `permissions` WHERE `id` = ?;",
      ["requests.upload_final_report"]
    );

    if (existingPerms.length === 0) {
      console.log("Permission 'requests.upload_final_report' does not exist in `permissions` table. Inserting it...");
      // Let's find module_id first, it should be 'requests'
      await connection.query(
        "INSERT INTO `permissions` (`id`, `name_ar`, `name_en`, `module_id`, `action`) VALUES (?, ?, ?, ?, ?);",
        ["requests.upload_final_report", "رفع التقرير الختامي", "Upload Final Report", "requests", "upload_final_report"]
      );
      console.log("✅ Permission inserted into `permissions` table.");
    } else {
      console.log("Permission 'requests.upload_final_report' already exists in `permissions` table.");
    }

    // 2. Assign the permission to corporate_comm in role_permissions table
    const [existingRolePerms] = await connection.query(
      "SELECT * FROM `role_permissions` WHERE `role_id` = ? AND `permission_id` = ?;",
      ["corporate_comm", "requests.upload_final_report"]
    );

    if (existingRolePerms.length === 0) {
      console.log("Assigning 'requests.upload_final_report' to 'corporate_comm'...");
      await connection.query(
        "INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (?, ?);",
        ["corporate_comm", "requests.upload_final_report"]
      );
      console.log("✅ Permission successfully assigned to corporate_comm role.");
    } else {
      console.log("corporate_comm already has the 'requests.upload_final_report' permission.");
    }

    // 3. Double check by listing permissions
    const [allRolePerms] = await connection.query(
      "SELECT * FROM `role_permissions` WHERE `role_id` = ?;",
      ["corporate_comm"]
    );
    console.log("Current role permissions for corporate_comm:");
    console.table(allRolePerms);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
