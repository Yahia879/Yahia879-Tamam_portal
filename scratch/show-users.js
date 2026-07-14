import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function showUsers(dbName) {
  const url = `mysql://root:@localhost:3306/${dbName}`;
  console.log(`\n--- USERS IN ${dbName} ---`);
  try {
    const connection = await mysql.createConnection(url);
    const [rows] = await connection.query("SELECT id, email, name, role FROM users");
    rows.forEach(u => console.log(` - ID: ${u.id} | Email: ${u.email} | Name: ${u.name} | Role: ${u.role}`));
    await connection.end();
  } catch (err) {
    console.error(`Error querying ${dbName}:`, err.message);
  }
}

async function main() {
  await showUsers("test_temam");
  await showUsers("temam");
}

main().catch(console.error);
