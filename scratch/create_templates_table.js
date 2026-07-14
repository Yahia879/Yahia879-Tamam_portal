import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Creating notification_templates table if not exists...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in environment or .env file.");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const query = `
      CREATE TABLE IF NOT EXISTS \`notification_templates\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`triggerId\` VARCHAR(100) NOT NULL UNIQUE,
        \`templateMessage\` TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await connection.query(query);
    console.log("✅ Table 'notification_templates' is ready!");
  } catch (error) {
    console.error("❌ Error creating table:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
