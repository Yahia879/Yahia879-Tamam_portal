import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to DB to update multi-mosque project schema...");

  try {
    // 1. Modify requestId to be NULLABLE in projects table
    console.log("Modifying projects.requestId to be NULLABLE...");
    try {
      await connection.query("ALTER TABLE `projects` MODIFY COLUMN `requestId` int NULL;");
      console.log("✅ projects.requestId is now NULLABLE.");
    } catch (err) {
      console.log("Note on projects.requestId:", err.message);
    }

    // 2. Add donorName column if missing
    console.log("Checking donorName column in projects...");
    try {
      await connection.query("ALTER TABLE `projects` ADD COLUMN `donorName` varchar(255) DEFAULT NULL;");
      console.log("✅ Added donorName to projects.");
    } catch (err) {
      console.log("donorName column note:", err.message);
    }

    // 3. Add isMultiMosque column if missing
    console.log("Checking isMultiMosque column in projects...");
    try {
      await connection.query("ALTER TABLE `projects` ADD COLUMN `isMultiMosque` tinyint(1) DEFAULT 0;");
      console.log("✅ Added isMultiMosque to projects.");
    } catch (err) {
      console.log("isMultiMosque column note:", err.message);
    }

    // 4. Create project_mosques table
    console.log("Creating project_mosques table if not exists...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`project_mosques\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`projectId\` int NOT NULL,
        \`mosqueId\` int NOT NULL,
        \`allocatedBudget\` decimal(15,2) DEFAULT NULL,
        \`notes\` text DEFAULT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`pm_proj_fk\` FOREIGN KEY (\`projectId\`) REFERENCES \`projects\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`pm_mosq_fk\` FOREIGN KEY (\`mosqueId\`) REFERENCES \`mosques\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ project_mosques table created successfully.");

    console.log("\n🎉 Database migration finished successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await connection.end();
  }
}

run();
