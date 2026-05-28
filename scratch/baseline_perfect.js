import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import crypto from "crypto";

async function main() {
  console.log("🚀 Starting Perfect Local Database Baselining...");

  const journalPath = path.resolve("./drizzle/meta/_journal.json");
  if (!fs.existsSync(journalPath)) {
    console.error("❌ Error: Drizzle journal file not found at", journalPath);
    return;
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const entries = journal.entries;
  console.log(`Found ${entries.length} migration entries in journal.`);

  // 1. Connect to original database 'temam'
  console.log("Connecting to local 'temam' database...");
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");

  // Ensure __drizzle_migrations table exists
  await connection.query(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
      hash text NOT NULL,
      created_at bigint(20) DEFAULT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Clear existing migrations to perform a clean baseline
  console.log("Clearing existing __drizzle_migrations records...");
  await connection.query("TRUNCATE TABLE __drizzle_migrations");

  console.log("Generating hashes and baselining...");
  let count = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const sqlFileName = `${entry.tag}.sql`;
    const sqlFilePath = path.resolve("./drizzle", sqlFileName);

    if (!fs.existsSync(sqlFilePath)) {
      console.warn(`⚠️ Warning: SQL file ${sqlFileName} not found, skipping...`);
      continue;
    }

    const content = fs.readFileSync(sqlFilePath, "utf8");
    const sha256 = crypto.createHash("sha256").update(content).digest("hex");

    // Insert record with original id, hash, and timestamp
    await connection.query(
      "INSERT INTO __drizzle_migrations (id, hash, created_at) VALUES (?, ?, ?)",
      [i + 1, sha256, entry.when]
    );

    count++;
  }

  await connection.end();
  console.log(`✨ Successfully registered ${count} baseline migration records in 'temam.__drizzle_migrations'!`);
  console.log("Drizzle migrations history is now perfectly aligned with your database schema. Running 'npx drizzle-kit migrate' will not attempt to re-create existing tables.");
}

main().catch(console.error);
