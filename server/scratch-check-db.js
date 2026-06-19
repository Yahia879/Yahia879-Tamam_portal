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
    const [roles] = await connection.query("SELECT id, name_ar FROM roles");
    console.log("=== Roles in DB ===");
    console.table(roles);
    
    const [permissions] = await connection.query("SELECT id, name_ar FROM permissions WHERE id LIKE '%supplier%'");
    console.log("=== Supplier permissions in DB ===");
    console.table(permissions);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await connection.end();
  }
}

main();
