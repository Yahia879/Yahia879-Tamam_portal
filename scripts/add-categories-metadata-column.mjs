import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/test_temam";
  console.log(`Connecting to database...`);
  const connection = await mysql.createConnection(databaseUrl);
  console.log("Connected to MySQL!");

  const query = "ALTER TABLE categories ADD COLUMN metadata TEXT NULL;";

  try {
    await connection.execute(query);
    console.log(`Executed: ${query}`);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("Column 'metadata' already exists in 'categories'.");
    } else {
      console.error("Error executing query:", error);
    }
  }

  await connection.end();
}

main().catch(console.error);
