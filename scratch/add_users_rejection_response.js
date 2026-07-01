import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Starting database check for users.rejectionResponse...");

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
         AND TABLE_NAME = 'users' 
         AND COLUMN_NAME = 'rejectionResponse'`
    );

    if (rows.length === 0) {
      console.log(`⚠️ Column 'rejectionResponse' is missing in table 'users'. Adding it...`);
      await connection.query("ALTER TABLE `users` ADD `rejectionResponse` TEXT");
      console.log(`✅ Column 'rejectionResponse' added successfully to 'users'.`);
    } else {
      console.log(`✨ Column 'rejectionResponse' already exists in table 'users'.`);
    }
  } catch (err) {
    console.error("❌ Database script failed:", err);
  } finally {
    await connection.end();
  }
}

main();
