import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    return;
  }
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    // Let's insert a test override for super_admin
    await connection.query(
      `INSERT INTO \`notification_trigger_settings\` (\`triggerId\`, \`roleId\`, \`channel\`, \`enabled\`) 
       VALUES ('notes_response_submitted', 'super_admin', 'in_app', 1) 
       ON DUPLICATE KEY UPDATE \`enabled\` = 1`
    );
    await connection.query(
      `INSERT INTO \`notification_trigger_settings\` (\`triggerId\`, \`roleId\`, \`channel\`, \`enabled\`) 
       VALUES ('notes_response_submitted', 'system_admin', 'in_app', 1) 
       ON DUPLICATE KEY UPDATE \`enabled\` = 1`
    );
    await connection.query(
      `INSERT INTO \`notification_trigger_settings\` (\`triggerId\`, \`roleId\`, \`channel\`, \`enabled\`) 
       VALUES ('exception_request_submitted', 'super_admin', 'in_app', 1) 
       ON DUPLICATE KEY UPDATE \`enabled\` = 1`
    );
    await connection.query(
      `INSERT INTO \`notification_trigger_settings\` (\`triggerId\`, \`roleId\`, \`channel\`, \`enabled\`) 
       VALUES ('exception_request_submitted', 'system_admin', 'in_app', 1) 
       ON DUPLICATE KEY UPDATE \`enabled\` = 1`
    );
    await connection.query(
      `INSERT INTO \`notification_trigger_settings\` (\`triggerId\`, \`roleId\`, \`channel\`, \`enabled\`) 
       VALUES ('exception_request_submitted', 'super_admin', 'email', 1) 
       ON DUPLICATE KEY UPDATE \`enabled\` = 1`
    );
    await connection.query(
      `INSERT INTO \`notification_trigger_settings\` (\`triggerId\`, \`roleId\`, \`channel\`, \`enabled\`) 
       VALUES ('exception_request_submitted', 'system_admin', 'email', 1) 
       ON DUPLICATE KEY UPDATE \`enabled\` = 1`
    );
    console.log("Inserted settings successfully.");

    const [rows] = await connection.query("SELECT * FROM `notification_trigger_settings`");
    console.log("Current rows:", rows);
  } catch (err) {
    console.error("Error inserting:", err);
  } finally {
    await connection.end();
  }
}

main();
