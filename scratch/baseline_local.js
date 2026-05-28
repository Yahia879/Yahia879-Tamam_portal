import mysql from "mysql2/promise";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function main() {
  const envPath = path.resolve(".env");
  const originalEnvContent = fs.readFileSync(envPath, "utf8");

  console.log("🚀 Starting automatic local database baselining...");

  // 1. Connect to MySQL to create temporary database
  const connection = await mysql.createConnection("mysql://root:@localhost:3306");
  console.log("Connected to MySQL server successfully.");

  console.log("Creating temporary database 'temp_drizzle_baseline'...");
  await connection.query("CREATE DATABASE IF NOT EXISTS temp_drizzle_baseline");

  // 2. Temporarily update .env to point to temp_drizzle_baseline
  console.log("Updating .env to point to the temporary database...");
  const tempEnvContent = originalEnvContent.replace(
    /DATABASE_URL=.*/,
    "DATABASE_URL=mysql://root:@localhost:3306/temp_drizzle_baseline"
  );
  fs.writeFileSync(envPath, tempEnvContent, "utf8");

  try {
    // 3. Run drizzle-kit migrate on the temporary database
    console.log("Running 'npx drizzle-kit migrate' on the temporary database...");
    execSync("npx drizzle-kit migrate", { stdio: "inherit" });
    console.log("Migrations applied successfully to the temporary database.");

    // 4. Fetch migration records from the temporary database
    console.log("Fetching migration history from temp_drizzle_baseline...");
    const tempConnection = await mysql.createConnection("mysql://root:@localhost:3306/temp_drizzle_baseline");
    const [rows] = await tempConnection.query("SELECT * FROM __drizzle_migrations");
    await tempConnection.end();
    console.log(`Found ${rows.length} migration records.`);

    // 5. Connect to original database 'temam'
    console.log("Connecting to the original 'temam' database...");
    const originalConnection = await mysql.createConnection("mysql://root:@localhost:3306/temam");

    // Make sure __drizzle_migrations table exists on the original database
    console.log("Ensuring __drizzle_migrations exists on 'temam'...");
    await originalConnection.query(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        hash text NOT NULL,
        created_at bigint(20) DEFAULT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. Insert all records into original __drizzle_migrations
    console.log("Inserting baseline migration records into 'temam.__drizzle_migrations'...");
    for (const row of rows) {
      await originalConnection.query(
        `INSERT INTO __drizzle_migrations (id, hash, created_at) VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE hash = VALUES(hash), created_at = VALUES(created_at)`,
        [row.id, row.hash, row.created_at]
      );
    }
    await originalConnection.end();
    console.log("Baseline migration records successfully written to 'temam'.");

  } catch (error) {
    console.error("❌ An error occurred during baselining:", error);
  } finally {
    // 7. Restore original .env content
    console.log("Restoring original .env configuration...");
    fs.writeFileSync(envPath, originalEnvContent, "utf8");

    // 8. Clean up temporary database
    console.log("Cleaning up temporary database 'temp_drizzle_baseline'...");
    await connection.query("DROP DATABASE IF EXISTS temp_drizzle_baseline");
    await connection.end();

    console.log("✨ Local database 'temam' successfully baselined!");
  }
}

main().catch(console.error);
