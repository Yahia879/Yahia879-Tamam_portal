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
    const [roles] = await connection.query("SELECT `id`, `receiveRequestNotifications`, `receiveRequestEmail` FROM `roles`");
    console.log("All roles notification settings:", roles);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
