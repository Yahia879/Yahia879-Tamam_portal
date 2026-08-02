import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

async function checkSync() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Checking DB schema sync against schema.ts definitions...");

  const [dbTablesRows] = await connection.query("SHOW TABLES");
  const dbNameResult = await connection.query("SELECT DATABASE() as db");
  const dbName = dbNameResult[0][0].db;
  const dbTables = dbTablesRows.map(row => Object.values(row)[0]);

  console.log(`Connected to database: ${dbName}`);
  console.log(`Database tables count: ${dbTables.length}`);

  // Table definitions from schema.ts that should exist:
  const expectedTables = [
    "project_financial_details",
    "receipt_vouchers"
  ];

  for (const t of expectedTables) {
    const exists = dbTables.includes(t);
    console.log(`Table '${t}': ${exists ? 'EXISTS' : 'MISSING ❌'}`);
  }

  // Check columns on project_financial_details if it existed
  // Also check if any recent columns were added to existing tables
  if (dbTables.includes("project_financial_details")) {
    const [cols] = await connection.query("SHOW COLUMNS FROM project_financial_details");
    const colNames = cols.map(c => c.Field);
    console.log("project_financial_details columns:", colNames);
  }

  await connection.end();
}

checkSync().catch(console.error);
