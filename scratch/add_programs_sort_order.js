import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Starting database check for programs.sortOrder...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in environment or .env file.");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [rows] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'programs' 
         AND COLUMN_NAME = 'sortOrder'`
    );

    if (rows.length === 0) {
      console.log(`⚠️ Column 'sortOrder' is missing in table 'programs'. Adding it...`);
      await connection.query("ALTER TABLE `programs` ADD `sortOrder` INT DEFAULT 0");
      console.log(`✅ Column 'sortOrder' added successfully to 'programs'.`);
    } else {
      console.log(`✨ Column 'sortOrder' already exists in table 'programs'.`);
    }
  } catch (err) {
    console.error("❌ Database script failed:", err);
  } finally {
    await connection.end();
  }
}

main();
