import { sql } from "drizzle-orm";
import { getDb } from "../server/db";
import * as dotenv from "dotenv";

// تحميل متغيرات البيئة
dotenv.config();

async function run() {
  console.log("Starting direct database schema migration...");
  const db = await getDb();
  if (!db) {
    console.error("Failed to get database instance. Make sure DATABASE_URL is set in .env");
    process.exit(1);
  }

  try {
    console.log("Adding column 'status' to table 'quick_response_reports'...");
    await db.execute(sql`ALTER TABLE \`quick_response_reports\` ADD COLUMN \`status\` VARCHAR(50) NULL;`);
    console.log("Success: Column 'status' added successfully to 'quick_response_reports'!");
  } catch (error: any) {
    if (error.message && error.message.includes("Duplicate column name")) {
      console.log("Column 'status' already exists in 'quick_response_reports'.");
    } else {
      console.error("Error executing migration query:", error);
    }
  }
  process.exit(0);
}

run();
