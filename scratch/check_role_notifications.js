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
    const [roles] = await connection.query("SELECT * FROM `roles` WHERE `id` IN ('super_admin', 'system_admin')");
    console.log("Roles settings:", roles);

    const [allSettings] = await connection.query("SELECT * FROM `notification_trigger_settings`");
    console.log("All trigger settings overrides:", allSettings);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
