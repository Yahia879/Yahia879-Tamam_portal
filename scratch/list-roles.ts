import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is missing");
    return;
  }
  const connection = await mysql.createConnection(connectionString);
  try {
    const [rows] = await connection.query("SELECT id, name_ar as nameAr, description, is_system as isSystem FROM roles");
    console.log("Roles in DB:", JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error("Error showing roles:", error);
  } finally {
    await connection.end();
  }
}

main();
