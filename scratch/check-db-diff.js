import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    console.log("Checking contracts_enhanced supportingEntity column length...");
    const [colsContracts] = await connection.query("SHOW COLUMNS FROM contracts_enhanced LIKE 'supportingEntity'");
    console.log("contracts_enhanced.supportingEntity:", colsContracts);

    console.log("\nChecking organization_settings columns...");
    const [colsOrg] = await connection.query("SHOW COLUMNS FROM organization_settings WHERE Field IN ('pmoManagerName', 'csrManagerName')");
    console.log("organization_settings fields:", colsOrg);

    console.log("\nChecking if category_values table exists...");
    const [tables] = await connection.query("SHOW TABLES LIKE 'category_values'");
    console.log("category_values table exists:", tables.length > 0);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
