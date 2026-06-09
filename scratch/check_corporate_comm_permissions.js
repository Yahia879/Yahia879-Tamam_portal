import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Checking role permissions for corporate_comm in database...");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await connection.query(
      "SELECT * FROM `role_permissions` WHERE `role_id` = ?;",
      ["corporate_comm"]
    );
    console.table(rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
