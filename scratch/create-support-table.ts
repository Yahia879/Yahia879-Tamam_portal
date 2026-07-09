import dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in environment.");
    return;
  }

  console.log("Connecting to database...");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS \`support_tickets\` (
        \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`userId\` int NOT NULL,
        \`ticketType\` enum('technical_issue', 'suggestion') NOT NULL,
        \`description\` text NOT NULL,
        \`attachments\` json DEFAULT NULL,
        \`status\` enum('pending', 'resolved', 'needs_clarification') NOT NULL DEFAULT 'pending',
        \`replies\` json DEFAULT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`support_tickets_userId_users_id_fk\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    console.log("Creating support_tickets table...");
    await connection.query(createTableSql);
    console.log("✅ Table support_tickets created successfully!");

  } catch (error) {
    console.error("❌ Error creating table:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
