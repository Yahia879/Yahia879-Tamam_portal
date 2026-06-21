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
    console.log("Checking total rows in clauses tables...");
    const [clauseValuesCount] = await connection.query("SELECT COUNT(*) as count FROM contract_clause_values");
    const [clausesCount] = await connection.query("SELECT COUNT(*) as count FROM contract_clauses");
    console.log(`Total rows in contract_clause_values: ${clauseValuesCount[0].count}`);
    console.log(`Total rows in contract_clauses: ${clausesCount[0].count}`);
    
    // List all contracts with their statuses and project details
    const [contracts] = await connection.query(
      "SELECT id, contractNumber, projectId, status, secondPartyName FROM contracts_enhanced"
    );
    console.table(contracts);
  } catch (err) {
    console.error("Error running SQL:", err);
  } finally {
    await connection.end();
  }
}

main();
