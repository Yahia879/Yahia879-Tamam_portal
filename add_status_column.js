import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Adding missing 'status' column to 'quick_response_reports' table on the server...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in environment or .env file.");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const tableName = "quick_response_reports";
    const columnName = "status";

    const [rows] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? 
         AND COLUMN_NAME = ?`,
      [tableName, columnName]
    );

    if (rows.length === 0) {
      console.log(`⚠️ Column '${columnName}' is missing in table '${tableName}'. Adding it...`);
      await connection.query(`ALTER TABLE \`${tableName}\` ADD \`${columnName}\` varchar(50) DEFAULT NULL`);
      console.log(`✅ Column '${columnName}' added successfully to '${tableName}'!`);
    } else {
      console.log(`✨ Column '${columnName}' already exists in table '${tableName}'.`);
    }

    console.log("\n🎉 Database columns are perfectly aligned! Let's restart PM2 now.");
  } catch (error) {
    console.error("❌ Error during column addition:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
