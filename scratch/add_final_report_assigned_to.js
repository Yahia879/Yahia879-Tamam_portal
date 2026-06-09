import "dotenv/config";
import { getDb } from "../server/db.ts";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("DB not available");
    process.exit(1);
  }

  console.log("Adding finalReportAssignedTo column to mosque_requests table...");
  try {
    // Check if column already exists
    const [columns] = await db.execute(sql`SHOW COLUMNS FROM mosque_requests LIKE 'finalReportAssignedTo'`);
    if (Array.isArray(columns) && columns.length > 0) {
      console.log("Column 'finalReportAssignedTo' already exists.");
    } else {
      await db.execute(sql`
        ALTER TABLE mosque_requests 
        ADD COLUMN finalReportAssignedTo INT NULL, 
        ADD CONSTRAINT fk_final_report_assigned_to FOREIGN KEY (finalReportAssignedTo) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log("Column 'finalReportAssignedTo' added successfully.");
    }
  } catch (error) {
    console.error("Error adding column:", error);
  }
  process.exit(0);
}

run().catch(console.error);
