import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/test_temam";
  console.log(`Connecting to database: ${databaseUrl}`);
  const connection = await mysql.createConnection(databaseUrl);
  console.log("Connected to MySQL!");

  const queries = [
    "ALTER TABLE contracts_enhanced ADD COLUMN supportingEntity VARCHAR(100) NULL;",
    "ALTER TABLE contracts_enhanced ADD COLUMN supportType VARCHAR(50) NULL;",
    "ALTER TABLE contracts_enhanced ADD COLUMN supportedAmount DECIMAL(15, 2) NULL;"
  ];

  for (const query of queries) {
    try {
      await connection.execute(query);
      console.log(`Executed: ${query}`);
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log(`Column already exists for: ${query}`);
      } else {
        console.error(`Error executing ${query}:`, error);
      }
    }
  }

  await connection.end();
}

main().catch(console.error);
