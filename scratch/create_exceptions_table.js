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
    console.log("Creating request_exceptions table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`request_exceptions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`reason\` TEXT NOT NULL,
        \`attachment\` VARCHAR(500) DEFAULT NULL,
        \`status\` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_request_exceptions_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Table request_exceptions created successfully.");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    await connection.end();
  }
}

main();
