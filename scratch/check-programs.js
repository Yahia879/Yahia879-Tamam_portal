import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/test_temam";
  const connection = await mysql.createConnection(dbUrl);
  
  const [rows] = await connection.query("SELECT id, name FROM programs");
  console.log("Programs in DB:", rows);

  await connection.end();
}

main().catch(console.error);
