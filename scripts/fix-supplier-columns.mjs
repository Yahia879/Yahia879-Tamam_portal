import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  console.log("Updating suppliers table columns to LONGTEXT...");
  
  try {
    await db.execute(sql`
      ALTER TABLE suppliers 
      MODIFY COLUMN commercialRegisterDoc LONGTEXT,
      MODIFY COLUMN vatCertificateDoc LONGTEXT,
      MODIFY COLUMN nationalAddressDoc LONGTEXT;
    `);
    console.log("Successfully updated suppliers table.");
  } catch (error) {
    console.error("Failed to update suppliers table:", error);
    process.exit(1);
  }
}

run();
