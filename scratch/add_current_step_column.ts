import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }
  try {
    await db.execute(sql`ALTER TABLE contracts_enhanced ADD COLUMN currentStep INT DEFAULT 1;`);
    console.log("Column currentStep added successfully");
  } catch (err: any) {
    if (err.message && err.message.includes("Duplicate column name")) {
      console.log("Column currentStep already exists");
    } else {
      console.error("Error adding column:", err);
    }
  }
  process.exit(0);
}

main();
