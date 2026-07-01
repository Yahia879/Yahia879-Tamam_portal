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
    const [rows] = await connection.query("SELECT * FROM `notification_trigger_settings` WHERE `triggerId` = 'notes_response_submitted'");
    console.log("Rows in notification_trigger_settings for notes_response_submitted:", rows);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
