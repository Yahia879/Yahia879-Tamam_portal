import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/temam";
  console.log("Connecting to database...", dbUrl);
  const connection = await mysql.createConnection(dbUrl);
  console.log("Connected to MySQL successfully!");

  try {
    const [cols] = await connection.execute("SHOW COLUMNS FROM project_financial_details LIKE 'associationFundingAmount'");
    if (cols.length === 0) {
      await connection.execute(`
        ALTER TABLE project_financial_details
        ADD COLUMN associationFundingAmount DECIMAL(15, 2) DEFAULT 0.00 AFTER adminFeeAmount,
        ADD COLUMN associationFundingNotes TEXT NULL AFTER associationFundingAmount;
      `);
      console.log("Added associationFundingAmount & associationFundingNotes columns to project_financial_details.");
    } else {
      console.log("Columns associationFundingAmount already exist.");
    }
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
