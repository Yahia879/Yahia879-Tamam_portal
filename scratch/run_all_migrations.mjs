import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function main() {
  console.log("🚀 Running all migration SQL files in drizzle/ directory...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is missing in .env");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const drizzleDir = path.resolve("./drizzle");
    const files = fs.readdirSync(drizzleDir).filter(f => f.endsWith(".sql")).sort();

    for (const file of files) {
      console.log(`\n📜 Processing ${file}...`);
      const filePath = path.join(drizzleDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");
      const statements = sqlContent.split("--> statement-breakpoint");

      let applied = 0;
      let skipped = 0;

      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (!trimmed) continue;
        try {
          await connection.query(trimmed);
          applied++;
        } catch (err) {
          if (
            err.code === "ER_TABLE_EXISTS_ERROR" ||
            err.code === "ER_DUP_FIELDNAME" ||
            err.code === "ER_DUP_KEYNAME" ||
            err.message?.includes("already exists") ||
            err.message?.includes("Duplicate column name")
          ) {
            skipped++;
          } else {
            console.warn(`  ⚠️ Exception on statement: ${err.message}`);
          }
        }
      }
      console.log(`  ✅ ${file}: ${applied} applied, ${skipped} skipped (already exists).`);
    }

    console.log("\n🎉 All migration SQL files processed successfully!");
  } catch (err) {
    console.error("❌ Error processing migrations:", err);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
