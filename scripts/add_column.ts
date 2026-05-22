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
    console.log("Adding column 'completionPercentage' to table 'contract_payments'...");
    await db.execute(sql`ALTER TABLE \`contract_payments\` ADD COLUMN \`completionPercentage\` INT NULL;`);
    console.log("Success: Column 'completionPercentage' added successfully to 'contract_payments'!");
  } catch (error: any) {
    // إذا كان العمود موجوداً بالفعل من محاولة سابقة، فلا مشكلة
    if (error.message && error.message.includes("Duplicate column name")) {
      console.log("Column 'completionPercentage' already exists in 'contract_payments'.");
    } else {
      console.error("Error executing migration query:", error);
    }
  }
  process.exit(0);
}

run();
