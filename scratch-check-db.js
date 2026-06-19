import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set");
    return;
  }
  const connection = await mysql.createConnection(dbUrl);
  try {
    console.log("Adding managementPercentage to contracts_enhanced...");
    await connection.query("ALTER TABLE contracts_enhanced ADD COLUMN managementPercentage DECIMAL(5, 2) DEFAULT 0.00");
    console.log("Successfully added column managementPercentage!");
  } catch (err) {
    console.error("Error running SQL:", err);
  } finally {
    await connection.end();
  }
}

main();
