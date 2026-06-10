import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await connection.query("SELECT id, name, email, role FROM users");
  console.log("Users in Database:");
  console.log(JSON.stringify(rows, null, 2));
  
  const [mosques] = await connection.query("SELECT id, name, city FROM mosques");
  console.log("Mosques in Database:");
  console.log(JSON.stringify(mosques, null, 2));
  
  await connection.end();
}

main().catch(console.error);
